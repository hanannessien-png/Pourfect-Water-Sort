import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BOOSTER_PACKS, REWARDS, type BoosterKind } from '@/src/config/cosmetics';
import { en } from '@/src/i18n/en';
import { isEndless } from '@/src/data/levels';
import { Backdrop } from '@/src/render/Backdrop';
import { Board, type BoardArea } from '@/src/render/Board';
import { onHardwareBack } from '@/src/services/backButton';
import { haptics } from '@/src/services/haptics';
import { watchForReward } from '@/src/state/rewards';
import { buyBoosterPack } from '@/src/state/shop';
import { useGame } from '@/src/state/useGame';
import { usePrefs } from '@/src/state/usePrefs';
import { getSave, useSaveStore } from '@/src/state/useSaveStore';
import { BoosterButton, Button, IconButton, type IconName } from '@/src/ui/Button';
import { Coin } from '@/src/ui/Coin';
import { CoinPill, Stars, Toast } from '@/src/ui/bits';
import { Sheet } from '@/src/ui/Sheet';
import { colors, fonts, radius, space, textOutline } from '@/src/ui/theme';

const BOOSTER_NAME: Record<BoosterKind, string> = { undo: en.game.undo, hint: en.game.hint, tube: en.game.addTube };
const BOOSTER_ICON: Record<BoosterKind, IconName> = { undo: 'arrow-undo', hint: 'bulb', tube: 'flask' };

export default function GameRoute() {
  const params = useLocalSearchParams<{ level?: string }>();
  const current = useSaveStore((s) => s.save.progress.current);
  const parsed = Number.parseInt(params.level ?? '', 10);
  const level = Number.isFinite(parsed) && parsed >= 1 ? Math.min(parsed, current) : current;
  // Remount per level so every level starts from clean state.
  return <GameScreen key={level} level={level} />;
}

function GameScreen({ level }: { level: number }) {
  const insets = useSafeAreaInsets();
  const prefs = usePrefs();
  const game = useGame(level);
  const tokens = useSaveStore((s) => s.save.tokens);
  const coins = useSaveStore((s) => s.save.wallet.coins);
  const [area, setArea] = useState<BoardArea | null>(null);
  const [paused, setPaused] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [doubled, setDoubled] = useState(false);
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);
  const say = (message: string) => setToast((t) => ({ message, id: (t?.id ?? 0) + 1 }));
  const update = useSaveStore((s) => s.update);

  const { session, win } = game;
  const hard = session?.def.hard ?? false;
  const endless = isEndless(level);

  // Let the confetti play before the win card comes up.
  useEffect(() => {
    if (!win) return;
    const t = setTimeout(() => setShowWin(true), 900);
    return () => clearTimeout(t);
  }, [win]);

  const anySheet = paused || showWin || game.stuck !== null || game.confirmRestart || game.need !== null;
  useFocusEffect(
    useCallback(() => {
      return onHardwareBack(() => {
        if (!anySheet) setPaused(true);
        return true;
      });
    }, [anySheet]),
  );

  const onBoardLayout = (e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    setArea({ x: x + space(1), y: y + space(1), width: width - space(2), height: height - space(1) });
  };

  const goLevel = (n: number) => router.replace({ pathname: '/game', params: { level: String(n) } });
  const busy = game.pour !== null || win !== null;
  const need = game.need;
  const needPack = need ? BOOSTER_PACKS.find((p) => p.booster === need) : undefined;

  const buyNeed = () => {
    if (!needPack) return;
    const r = buyBoosterPack(getSave(), needPack.id);
    if (!r.ok) {
      say(en.game.notEnoughCoins);
      return;
    }
    update(() => r.save, 'now');
    haptics.complete();
    game.clearNeed();
  };
  const watchNeed = async () => {
    if (!need) return;
    const kind = need;
    game.clearNeed();
    const res = await watchForReward({ kind: 'booster', booster: kind, amount: REWARDS.videoBooster });
    if (res === 'granted') say(en.game.gotBooster(BOOSTER_NAME[kind]));
    else if (res === 'limit') say(en.home.limitReached);
  };
  const watchDouble = async () => {
    if (!win || doubled) return;
    const res = await watchForReward({ kind: 'double', amount: win.coins });
    if (res === 'granted') {
      setDoubled(true);
      haptics.win();
    } else if (res === 'limit') say(en.home.limitReached);
  };

  return (
    <View style={styles.root}>
      <Backdrop lowGfx={prefs.lowGfx} />

      {/* HUD */}
      <View style={[styles.hud, { paddingTop: insets.top + space(1) }]}>
        <IconButton icon="pause" label={en.game.pause} onPress={() => setPaused(true)} testID="game-pause" />
        <View style={styles.hudCenter} accessible accessibilityRole="header">
          <View style={styles.plaque}>
            <Text style={[styles.levelTitle, textOutline]}>{en.game.level(level)}</Text>
            {session && (
              <Text style={styles.moves}>
                {en.game.moves(session.history.length)} · {en.game.par(session.def.par)}
              </Text>
            )}
          </View>
          {(hard || endless) && (
            <View style={[styles.tag, hard ? styles.tagHard : styles.tagEndless]}>
              <Text style={styles.tagText}>{hard ? en.game.hard : en.game.endless}</Text>
            </View>
          )}
        </View>
        <IconButton icon="refresh" label={en.game.restart} onPress={game.restart} disabled={!session || busy} testID="tool-restart" />
      </View>
      <View style={styles.coinRow}>
        <CoinPill amount={coins} onPlus={() => router.push('/shop')} testID="game-coins" />
      </View>

      {/* Board area (the board canvas covers the whole screen so pours never clip) */}
      <View style={styles.boardArea} onLayout={onBoardLayout}>
        {!session && (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.gold} size="large" />
            <Text style={styles.loadingText}>{endless ? en.game.generating : en.common.loading}</Text>
          </View>
        )}
      </View>
      {session && area && (
        <Board
          area={area}
          board={session.board}
          totals={session.totals}
          selected={game.selected}
          pour={game.pour}
          onPourDone={game.onPourDone}
          onTapTube={game.tap}
          hint={game.hint}
          shake={game.shake}
          shades={prefs.shades}
          skin={prefs.skin}
          colorBlind={prefs.colorBlind}
          lowGfx={prefs.lowGfx}
          reduceMotion={prefs.reduceMotion}
          winKey={game.winKey}
        />
      )}

      {/* Boosters */}
      <View style={[styles.toolbar, { paddingBottom: insets.bottom + space(1.5) }]} pointerEvents="box-none">
        <View style={styles.toastSlot} pointerEvents="none">
          <Toast message={toast?.message ?? game.toast?.message ?? null} id={(toast?.id ?? 0) * 1000 + (game.toast?.id ?? 0)} />
        </View>
        <View style={styles.tools}>
          <BoosterButton icon={BOOSTER_ICON.undo} label={en.game.undo} count={tokens.undo} onPress={game.undo} disabled={!session || busy} testID="tool-undo" />
          <BoosterButton
            icon={BOOSTER_ICON.hint}
            label={game.hintBusy ? en.game.hintThinking : en.game.hint}
            count={tokens.hint}
            busy={game.hintBusy}
            onPress={() => void game.requestHint()}
            disabled={!session || busy || game.hintBusy}
            testID="tool-hint"
          />
          <BoosterButton
            icon={BOOSTER_ICON.tube}
            label={en.game.addTube}
            count={tokens.tube}
            onPress={game.addTube}
            disabled={!session || busy || !game.canAddMore}
            testID="tool-add-tube"
          />
        </View>
      </View>

      {/* Get more boosters */}
      <Sheet visible={need !== null} title={need ? en.game.getMore(BOOSTER_NAME[need]) : undefined} ribbon="sapphire" onDismiss={game.clearNeed} testID="sheet-booster">
        {need && needPack && (
          <>
            <View style={styles.boosterHero}>
              <BoosterButton icon={BOOSTER_ICON[need]} label={BOOSTER_NAME[need]} count={tokens[need]} onPress={() => undefined} />
            </View>
            <Text style={styles.sheetBody}>{en.game.boosterBody[need]}</Text>
            <Button label={en.game.buyPack(needPack.amount)} price={needPack.price} variant="gold" onPress={buyNeed} disabled={coins < needPack.price} testID="booster-buy" />
            <Button label={en.game.watchFor(REWARDS.videoBooster)} video variant="emerald" onPress={() => void watchNeed()} testID="booster-watch" />
          </>
        )}
      </Sheet>

      {/* Pause */}
      <Sheet visible={paused} title={en.pause.title} onDismiss={() => setPaused(false)} testID="sheet-pause">
        <Button label={en.pause.resume} icon="play" size="lg" onPress={() => setPaused(false)} />
        <Button
          label={en.pause.restart}
          icon="refresh"
          variant="plum"
          onPress={() => {
            setPaused(false);
            game.restart();
          }}
        />
        <View style={styles.row}>
          <Button label={en.pause.levels} icon="grid" variant="plum" size="sm" style={styles.flex} onPress={() => router.replace('/levels')} />
          <Button label={en.pause.home} icon="home" variant="plum" size="sm" style={styles.flex} onPress={() => router.dismissTo('/')} />
        </View>
        <Button
          label={en.pause.settings}
          icon="settings-sharp"
          variant="ghost"
          size="sm"
          onPress={() => {
            setPaused(false);
            router.push('/settings');
          }}
        />
      </Sheet>

      {/* Restart confirmation */}
      <Sheet
        visible={game.confirmRestart}
        title={en.game.restartConfirmTitle}
        subtitle={en.game.restartConfirmBody(session?.history.length ?? 0)}
        onDismiss={game.cancelRestart}
      >
        <Button label={en.game.restart} icon="refresh" variant="ruby" onPress={game.doRestart} />
        <Button label={en.common.cancel} variant="plum" onPress={game.cancelRestart} />
      </Sheet>

      {/* Stuck */}
      <Sheet
        visible={game.stuck !== null && !showWin}
        title={en.stuck.title}
        subtitle={game.stuck === 'noMoves' ? en.stuck.noMoves : en.stuck.deadEnd}
        onDismiss={game.dismissStuck}
        testID="sheet-stuck"
      >
        <View style={styles.row}>
          <Button
            label={`${en.stuck.undo} (${tokens.undo})`}
            icon="arrow-undo"
            variant="emerald"
            size="sm"
            style={styles.flex}
            disabled={!session || session.history.length === 0}
            onPress={game.undo}
          />
          <Button
            label={`${en.stuck.addTube} (${tokens.tube})`}
            icon="add-circle"
            variant="gold"
            size="sm"
            style={styles.flex}
            disabled={!game.canAddMore}
            onPress={game.addTube}
          />
        </View>
        <Button label={en.stuck.restart} icon="refresh" onPress={game.doRestart} />
        {game.stuck === 'deadEnd' && <Button label={en.stuck.keepLooking} variant="ghost" size="sm" onPress={game.dismissStuck} />}
      </Sheet>

      {/* Win */}
      <Sheet visible={showWin && win !== null} title={win?.hard ? en.win.hardTitle : en.win.title} ribbon="emerald" testID="sheet-win">
        {win && (
          <>
            <Stars count={win.stars} size={46} animate={!prefs.reduceMotion} />
            <Text style={styles.winMoves}>{en.win.moves(win.moves, win.par)}</Text>
            {win.newBest && <Text style={styles.newBest}>{en.win.newBest}</Text>}
            {win.coins > 0 ? (
              <View style={styles.winCoins}>
                <Coin size={44} />
                <Text style={[styles.winCoinText, textOutline]}>+{doubled ? win.coins * 2 : win.coins}</Text>
              </View>
            ) : (
              <Text style={styles.winNote}>{en.win.noCoinsReplay}</Text>
            )}
            {win.coins > 0 && !doubled && (
              <Button label={en.win.claimDouble} video variant="emerald" onPress={() => void watchDouble()} testID="win-double" />
            )}
            <Button label={en.win.next} icon="arrow-forward" size="lg" onPress={() => goLevel(level + 1)} testID="win-next" />
            <View style={styles.winRow}>
              <IconButton icon="refresh" label={en.win.replay} onPress={() => goLevel(level)} />
              <IconButton icon="home" label={en.pause.home} onPress={() => router.dismissTo('/')} />
              <IconButton icon="grid" label={en.pause.levels} onPress={() => router.replace('/levels')} />
            </View>
          </>
        )}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hud: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: space(2),
  },
  hudCenter: { alignItems: 'center', flex: 1, paddingHorizontal: space(1) },
  plaque: {
    alignItems: 'center',
    minWidth: 170,
    paddingHorizontal: space(2.5),
    paddingTop: 4,
    paddingBottom: 6,
    borderRadius: radius.md,
    backgroundColor: 'rgba(23,12,48,0.88)',
    borderWidth: 2,
    borderColor: colors.gold,
  },
  levelTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.goldHi, letterSpacing: 0.8 },
  moves: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted },
  tag: { borderRadius: radius.pill, paddingHorizontal: space(1.25), paddingVertical: 2, marginTop: -6, borderWidth: 1.5, borderColor: '#FFFFFF' },
  tagHard: { backgroundColor: colors.ruby },
  tagEndless: { backgroundColor: colors.sapphireDeep },
  tagText: { fontFamily: fonts.display, fontSize: 12, color: '#FFFFFF', letterSpacing: 0.8 },
  coinRow: { alignItems: 'center', marginTop: space(1) },
  boardArea: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space(2) },
  loadingText: { fontFamily: fonts.medium, fontSize: 16, color: colors.textMuted },
  toolbar: { paddingHorizontal: space(2) },
  toastSlot: { position: 'absolute', left: 0, right: 0, top: -space(7), alignItems: 'center' },
  tools: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start', paddingTop: space(1) },
  row: { flexDirection: 'row', gap: space(1.5) },
  flex: { flex: 1 },
  sheetBody: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.textMuted, textAlign: 'center' },
  boosterHero: { alignItems: 'center' },
  winMoves: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textMuted, textAlign: 'center' },
  newBest: { fontFamily: fonts.display, fontSize: 18, color: colors.gold, textAlign: 'center', letterSpacing: 0.5 },
  winNote: { fontFamily: fonts.medium, fontSize: 14, color: colors.textFaint, textAlign: 'center' },
  winCoins: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space(1) },
  winCoinText: { fontFamily: fonts.display, fontSize: 38, color: colors.goldHi },
  winRow: { flexDirection: 'row', justifyContent: 'center', gap: space(3), marginTop: space(0.5) },
});
