import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ECONOMY } from '@/src/config/economy';
import { SOLVER_LIMITS } from '@/src/config/difficulty';
import { TIMER, timeLimitMs } from '@/src/config/timer';
import { getLevel, isEndless, pregenerate } from '@/src/data/levels';
import { en } from '@/src/i18n/en';
import { encodeBoard } from '@/src/game/codec';
import { HintSearch, type HintOutcome } from '@/src/game/hint';
import { isTubeComplete, legalPours } from '@/src/game/rules';
import { addTube, canAddTube, commitPour, newSession, resolveTap, restartSession, undoLast, type SessionState } from '@/src/game/session';
import { CancelledError, runSliced, type SlicedTask } from '@/src/game/sliced';
import type { LevelDef, PourRef } from '@/src/game/types';
import type { ActivePour } from '@/src/render/Board';
import { haptics } from '@/src/services/haptics';
import { recordWin, spendToken } from './progress';
import { sessionFromResume, sessionToResume } from './resume';
import { getSave, useSaveStore } from './useSaveStore';

/**
 * In-level game controller: loads the level (or resumes it), applies taps, drives the pour
 * animation lifecycle, spends booster tokens, detects stuck positions in the background
 * and records the win.
 */

export type StuckReason = 'noMoves' | 'deadEnd';

/** Why the level clock is paused. The clock runs only when no hold is set. */
export type ClockHold = 'ui' | 'app' | 'focus' | 'done' | 'timeUp';

export interface WinInfo {
  stars: 1 | 2 | 3;
  coins: number;
  firstClear: boolean;
  newBest: boolean;
  moves: number;
  par: number;
  hard: boolean;
}

interface Analysis {
  key: string;
  outcome: HintOutcome | null;
  promise: Promise<HintOutcome> | null;
  task: SlicedTask<HintOutcome> | null;
}

export function useGame(level: number) {
  const update = useSaveStore((st) => st.update);
  const [session, setSession] = useState<SessionState | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [pour, setPour] = useState<ActivePour | null>(null);
  const [shake, setShake] = useState({ index: -1, key: 0 });
  const [hint, setHint] = useState<PourRef | null>(null);
  const [hintBusy, setHintBusy] = useState(false);
  const [stuck, setStuck] = useState<StuckReason | null>(null);
  const [win, setWin] = useState<WinInfo | null>(null);
  const [winKey, setWinKey] = useState(0);
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);
  const [confirmRestart, setConfirmRestart] = useState(false);
  /** Booster the player tried to use with no tokens left (opens the "get more" sheet). */
  const [need, setNeed] = useState<'undo' | 'hint' | 'tube' | null>(null);

  const sRef = useRef<SessionState | null>(null);
  const pourRef = useRef<ActivePour | null>(null);
  const selRef = useRef<number | null>(null);
  const pendingWin = useRef(false);
  const pourSeq = useRef(0);
  const analysis = useRef<Analysis | null>(null);
  // Level clock: `base` ms already counted + time since `startedAt` while no hold is set.
  const clock = useRef({ base: 0, startedAt: 0, holds: new Set<ClockHold>(['ui']) });
  const limitRef = useRef(0);
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [timeUp, setTimeUp] = useState(false);

  const say = useCallback((message: string) => setToast((t) => ({ message, id: (t?.id ?? 0) + 1 })), []);

  const apply = useCallback((s: SessionState) => {
    sRef.current = s;
    setSession(s);
  }, []);
  const select = useCallback((i: number | null) => {
    selRef.current = i;
    setSelected(i);
  }, []);

  const running = () => clock.current.holds.size === 0;
  const elapsed = () => clock.current.base + (running() ? Date.now() - clock.current.startedAt : 0);

  const setHold = useCallback((hold: ClockHold, on: boolean) => {
    const c = clock.current;
    if (c.holds.has(hold) === on) return;
    const wasRunning = c.holds.size === 0;
    if (wasRunning) c.base += Date.now() - c.startedAt;
    if (on) c.holds.add(hold);
    else c.holds.delete(hold);
    if (c.holds.size === 0) c.startedAt = Date.now();
  }, []);

  const resetClock = (elapsedMs: number) => {
    const c = clock.current;
    c.base = elapsedMs;
    c.startedAt = Date.now();
    c.holds.delete('done');
    c.holds.delete('timeUp');
  };

  // App in the background pauses the clock.
  useEffect(() => {
    setHold('app', AppState.currentState !== 'active');
    const sub = AppState.addEventListener('change', (st) => setHold('app', st !== 'active'));
    return () => sub.remove();
  }, [setHold]);

  // Countdown tick. Re-renders only when the displayed second changes.
  useEffect(() => {
    if (!session) return;
    const tick = () => {
      if (limitRef.current <= 0) return;
      const left = Math.max(0, limitRef.current - elapsed());
      setRemainingMs(Math.ceil(left / 1000) * 1000);
      if (left <= 0 && running() && !pendingWin.current) {
        setHold('timeUp', true);
        select(null);
        haptics.invalid();
        setTimeUp(true);
      }
    };
    tick();
    const iv = setInterval(tick, 250);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session !== null, setHold]);

  const persistResume = useCallback(
    (s: SessionState) => {
      update((save) => ({ ...save, resume: sessionToResume(s, level, elapsed()) }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [update, level],
  );

  /** Background solve of the current position: caches the hint and detects dead ends. */
  const analyze = useCallback((s: SessionState, reportStuck: boolean) => {
    analysis.current?.task?.cancel();
    const key = encodeBoard(s.board);
    if (legalPours(s.board, s.totals).length === 0) {
      analysis.current = { key, outcome: { kind: 'no-moves' }, promise: null, task: null };
      if (reportStuck) setStuck('noMoves');
      return;
    }
    const search = new HintSearch(s.board, SOLVER_LIMITS.hint);
    const task = runSliced((budget) => search.step(budget));
    const a: Analysis = { key, outcome: null, promise: task.promise, task };
    analysis.current = a;
    task.promise.then(
      (out) => {
        a.outcome = out;
        a.task = null;
        if (analysis.current !== a || !reportStuck || pendingWin.current) return;
        if (out.kind === 'dead-end' || out.kind === 'no-moves') setStuck('deadEnd');
      },
      (e: unknown) => {
        if (!(e instanceof CancelledError)) console.warn('Analysis failed', e);
      },
    );
  }, []);

  // ---- Load / resume -------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const start = (s: SessionState, elapsedMs: number) => {
      if (cancelled) return;
      limitRef.current = timeLimitMs(s.def.par, s.def.hard);
      resetClock(elapsedMs);
      apply(s);
      select(null);
      persistResume(s);
      analyze(s, true);
      pregenerate(level + 1);
    };
    const resume = getSave().resume;
    const mode = isEndless(level) ? 'endless' : 'campaign';
    const matching = resume && resume.level === level && resume.mode === mode ? resume : null;

    // Endless boards are restored straight from the save (no regeneration needed).
    const endlessResume = matching && mode === 'endless' ? sessionFromResume(matching, null) : null;
    if (endlessResume && matching) {
      start(endlessResume, matching.elapsedMs);
    } else {
      const got = getLevel(level);
      const begin = (def: LevelDef) => {
        const restored = matching ? sessionFromResume(matching, def) : null;
        start(restored ?? newSession(def), restored && matching ? matching.elapsedMs : 0);
      };
      if (got instanceof Promise) {
        got.then(begin, (e: unknown) => console.warn('Level generation failed', e));
      } else {
        begin(got);
      }
    }
    return () => {
      cancelled = true;
      analysis.current?.task?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  // ---- Taps ------------------------------------------------------------------------------
  const tap = useCallback(
    (index: number) => {
      const s = sRef.current;
      if (!s || pourRef.current || pendingWin.current || clock.current.holds.has('timeUp')) return;
      const out = resolveTap(s, selRef.current, index);
      switch (out.kind) {
        case 'select':
        case 'reselect':
          haptics.select();
          select(out.index);
          return;
        case 'deselect':
          select(null);
          return;
        case 'invalid':
          haptics.invalid();
          setShake((k) => ({ index, key: k.key + 1 }));
          return;
        case 'pour': {
          const prev = s.board;
          const next = commitPour(s, out.move, out.board);
          analysis.current?.task?.cancel();
          analysis.current = null;
          apply(next);
          select(null);
          setHint(null);
          setStuck(null);
          haptics.pour();
          pendingWin.current = out.won;
          if (out.won) setHold('done', true);
          const p: ActivePour = { id: ++pourSeq.current, move: out.move, prev };
          pourRef.current = p;
          setPour(p);
          if (!out.won) persistResume(next);
          return;
        }
      }
    },
    [apply, select, persistResume, setHold],
  );

  const onPourDone = useCallback(
    (id: number) => {
      const p = pourRef.current;
      if (!p || p.id !== id) return;
      pourRef.current = null;
      setPour(null);
      const s = sRef.current;
      if (!s) return;
      if (isTubeComplete(s.board.tubes[p.move.to] ?? '', s.totals)) haptics.complete();
      if (pendingWin.current) {
        const res = recordWin(getSave(), {
          level,
          moves: s.history.length,
          par: s.def.par,
          hard: s.def.hard,
          hintsUsed: s.hintsUsed,
          undosUsed: s.undosUsed,
          tubesAdded: s.addedTubes,
          pours: s.poursMade,
        });
        update(() => res.save, 'now');
        haptics.win();
        setWinKey((k) => k + 1);
        setWin({
          stars: res.stars,
          coins: res.coins,
          firstClear: res.firstClear,
          newBest: res.newBest,
          moves: s.history.length,
          par: s.def.par,
          hard: s.def.hard,
        });
        pregenerate(level + 1);
        return;
      }
      analyze(s, true);
    },
    [analyze, level, update],
  );

  // ---- Boosters -------------------------------------------------------------------------
  const spend = useCallback(
    (kind: 'undo' | 'hint' | 'tube'): boolean => {
      const next = spendToken(getSave(), kind);
      if (!next) return false;
      update(() => next, 'now');
      return true;
    },
    [update],
  );

  const busy = () => !sRef.current || pourRef.current !== null || pendingWin.current;

  const undo = useCallback(() => {
    const s = sRef.current;
    if (!s || busy()) return;
    if (s.history.length === 0) {
      say(en.game.noUndo);
      return;
    }
    if (!spend('undo')) {
      setNeed('undo');
      return;
    }
    const r = undoLast(s);
    if (!r) return;
    apply(r.state);
    select(null);
    setHint(null);
    setStuck(null);
    haptics.select();
    persistResume(r.state);
    analyze(r.state, false);
     
  }, [apply, select, say, spend, persistResume, analyze]);

  const addTubeAction = useCallback(() => {
    const s = sRef.current;
    if (!s || busy()) return;
    if (!canAddTube(s)) {
      say(en.game.addTubeLimit);
      return;
    }
    if (!spend('tube')) {
      setNeed('tube');
      return;
    }
    const next = addTube(s);
    if (!next) return;
    apply(next);
    select(null);
    setHint(null);
    setStuck(null);
    haptics.complete();
    persistResume(next);
    analyze(next, false);
     
  }, [apply, select, say, spend, persistResume, analyze]);

  const hintAction = useCallback(async () => {
    const s = sRef.current;
    if (!s || busy() || hintBusy) return;
    const key = encodeBoard(s.board);
    let a = analysis.current;
    if (!a || a.key !== key) {
      analyze(s, false);
      a = analysis.current;
    }
    if (!a) return;
    let outcome = a.outcome;
    if (!outcome && a.promise) {
      setHintBusy(true);
      try {
        outcome = await a.promise;
      } catch {
        outcome = null;
      } finally {
        setHintBusy(false);
      }
    }
    // The board may have changed while we waited.
    if (!outcome || sRef.current !== s) return;
    if (outcome.kind !== 'move') {
      say(en.game.deadEndHint);
      setStuck(outcome.kind === 'no-moves' && legalPours(s.board, s.totals).length === 0 ? 'noMoves' : 'deadEnd');
      return;
    }
    if (!spend('hint')) {
      setNeed('hint');
      return;
    }
    const next = { ...s, hintsUsed: s.hintsUsed + 1 };
    apply(next);
    persistResume(next);
    select(null);
    setHint(outcome.move);
    haptics.select();
     
  }, [analyze, apply, hintBusy, persistResume, say, select, spend]);

  const doRestart = useCallback(() => {
    const s = sRef.current;
    if (!s || pourRef.current) return;
    const next = restartSession(s);
    pendingWin.current = false;
    resetClock(0);
    setTimeUp(false);
    setConfirmRestart(false);
    apply(next);
    select(null);
    setHint(null);
    setStuck(null);
    persistResume(next);
    analyze(next, true);
  }, [analyze, apply, persistResume, select]);

  const restart = useCallback(() => {
    const s = sRef.current;
    if (!s || busy()) return;
    if (s.history.length >= ECONOMY.restartConfirmMoves) setConfirmRestart(true);
    else doRestart();
     
  }, [doRestart]);

  /** Rewarded "+60 s" on the Time's up sheet. */
  const addTime = useCallback(() => {
    const c = clock.current;
    // May go below zero: that is bonus time beyond the level's limit.
    c.base = elapsed() - TIMER.extraSec * 1000;
    if (running()) c.startedAt = Date.now();
    setHold('timeUp', false);
    setTimeUp(false);
    const s = sRef.current;
    if (s) persistResume(s);
    // `elapsed`/`running` only read the clock ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistResume, setHold]);

  return {
    session,
    remainingMs,
    timeUp,
    addTime,
    setHold,
    selected,
    pour,
    shake,
    hint,
    hintBusy,
    stuck,
    win,
    winKey,
    toast,
    confirmRestart,
    tap,
    onPourDone,
    undo,
    addTube: addTubeAction,
    requestHint: hintAction,
    restart,
    doRestart,
    cancelRestart: () => setConfirmRestart(false),
    dismissStuck: () => setStuck(null),
    need,
    clearNeed: () => setNeed(null),
    canAddMore: session ? canAddTube(session) : false,
  };
}
