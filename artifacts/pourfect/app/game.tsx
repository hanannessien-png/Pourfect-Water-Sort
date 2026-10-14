import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { en } from '@/src/i18n/en';
import { isEndless } from '@/src/data/levels';
import { Backdrop } from '@/src/render/Backdrop';
import { Board, type BoardArea } from '@/src/render/Board';
import { onHardwareBack } from '@/src/services/backButton';
import { useGame } from '@/src/state/useGame';
import { usePrefs } from '@/src/state/usePrefs';
import { useSaveStore } from '@/src/state/useSaveStore';
import { Button, IconButton, ToolButton } from '@/src/ui/Button';
import { CurrencyChip, Stars, Toast } from '@/src/ui/bits';
import { Sheet } from '@/src/ui/Sheet';
import { colors, fonts, radius, space } from '@/src/ui/theme';

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

  const { session, win } = game;
  const hard = session?.def.hard ?? false;
  const endless = isEndless(level);

  // Let the confetti play before the win card comes up.
  useEffect(() => {
    if (!win) return;
    const t = setTimeout(() => setShowWin(true), 900);
    return () => clearTimeout(t);
  }, [win]);

  const anySheet = paused || showWin || game.stuck !== null || game.confirmRestart;
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

  return (
    <View style={styles.root}>
      <Backdrop lowGfx={prefs.lowGfx} />

      {/* HUD */}
      <View style={[styles.hud, { paddingTop: insets.top + space(1) }]}>
        <IconButton icon="pause" label={en.game.pause} onPress={() => setPaused(true)} testID="game-pause" />
        <View style={styles.hudCenter} accessible accessibilityRole="header">
          <View style={styles.titleRow}>
            <Text style={styles.levelTitle}>{en.game.level(level)}</Text>
            {hard && (
              <View style={[styles.tag, styles.tagHard]}>
                <Text style={styles.tagText}>{en.game.hard}</Text>
              </View>
            )}
            {endless && !hard && (
              <View style={[styles.tag, styles.tagEndless]}>
                <Text style={styles.tagText}>{en.game.endless}</Text>
              </View>
            )}
          </View>
          {session && (
            <Text style={styles.moves}>
              {en.game.moves(session.history.length)} · {en.game.par(session.def.par)}
            </Text>
          )}
        </View>
        <CurrencyChip kind="coins" amount={coins} />
      </View>

      {/* Board area (the board canvas covers the whole screen so pours never clip) */}
      <View style={styles.boardArea} onLayout={onBoardLayout}>
        {!session && (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.teal} size="large" />
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
          colorBlind={prefs.colorBlind}
          lowGfx={prefs.lowGfx}
          reduceMotion={prefs.reduceMotion}
          winKey={game.winKey}
        />
      )}

      {/* Toolbar */}
      <View style={[styles.toolbar, { paddingBottom: insets.bottom + space(1.5) }]} pointerEvents="box-none">
        <View style={styles.toastSlot} pointerEvents="none">
          <Toast message={game.toast?.message ?? null} id={game.toast?.id ?? 0} />
        </View>
        <View style={styles.tools}>
          <ToolButton icon="refresh" label={en.game.restart} onPress={game.restart} disabled={!session || busy} testID="tool-restart" />
          <ToolButton
            icon="arrow-undo"
            label={en.game.undo}
            onPress={game.undo}
            disabled={!session || busy}
            badge={tokens.undo}
            testID="tool-undo"
          />
          <ToolButton
            icon={game.hintBusy ? 'hourglass' : 'bulb'}
            label={game.hintBusy ? en.game.hintThinking : en.game.hint}
            onPress={() => void game.requestHint()}
            disabled={!session || busy || game.hintBusy}
            badge={tokens.hint}
            testID="tool-hint"
          />
          <ToolButton
            icon="add-circle"
            label={en.game.addTube}
            onPress={game.addTube}
            disabled={!session || busy || !game.canAddMore}
            badge={tokens.tube}
            testID="tool-add-tube"
          />
        </View>
      </View>

      {/* Pause */}
      <Sheet visible={paused} title={en.pause.title} onDismiss={() => setPaused(false)} testID="sheet-pause">
        <Button label={en.pause.resume} icon="play" onPress={() => setPaused(false)} />
        <Button
          label={en.pause.restart}
          icon="refresh"
          variant="secondary"
          onPress={() => {
            setPaused(false);
            game.restart();
          }}
        />
        <View style={styles.row}>
          <Button label={en.pause.levels} icon="grid" variant="secondary" size="sm" style={styles.flex} onPress={() => router.replace('/levels')} />
          <Button label={en.pause.home} icon="home" variant="secondary" size="sm" style={styles.flex} onPress={() => router.dismissTo('/')} />
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
        <Button label={en.game.restart} icon="refresh" variant="danger" onPress={game.doRestart} />
        <Button label={en.common.cancel} variant="secondary" onPress={game.cancelRestart} />
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
            variant="teal"
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
      <Sheet visible={showWin && win !== null} title={win?.hard ? en.win.hardTitle : en.win.title} testID="sheet-win">
        {win && (
          <>
            <Stars count={win.stars} size={44} animate={!prefs.reduceMotion} />
            <Text style={styles.winMoves}>{en.win.moves(win.moves, win.par)}</Text>
            {win.newBest && <Text style={styles.newBest}>{en.win.newBest}</Text>}
            {win.coins > 0 ? (
              <View style={styles.coinRow}>
                <CurrencyChip kind="coins" amount={win.coins} />
              </View>
            ) : (
              <Text style={styles.winNote}>{en.win.noCoinsReplay}</Text>
            )}
            <Button label={en.win.next} icon="arrow-forward" size="lg" onPress={() => goLevel(level + 1)} testID="win-next" />
            <View style={styles.row}>
              <Button label={en.win.replay} icon="refresh" variant="secondary" size="sm" style={styles.flex} onPress={() => goLevel(level)} />
              <Button label={en.pause.home} icon="home" variant="secondary" size="sm" style={styles.flex} onPress={() => router.dismissTo('/')} />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space(2),
    paddingBottom: space(1),
  },
  hudCenter: { alignItems: 'center', flex: 1, paddingHorizontal: space(1) },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
  levelTitle: { fontFamily: fonts.bold, fontSize: 24, color: colors.text },
  tag: { borderRadius: radius.pill, paddingHorizontal: space(1), paddingVertical: 2 },
  tagHard: { backgroundColor: colors.danger },
  tagEndless: { backgroundColor: colors.tealDark },
  tagText: { fontFamily: fonts.bold, fontSize: 12, color: '#FFFFFF', letterSpacing: 0.4 },
  moves: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted, marginTop: 2 },
  boardArea: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space(2) },
  loadingText: { fontFamily: fonts.medium, fontSize: 16, color: colors.textMuted },
  toolbar: { paddingHorizontal: space(2) },
  toastSlot: { position: 'absolute', left: 0, right: 0, top: -space(7), alignItems: 'center' },
  tools: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start', paddingTop: space(1) },
  row: { flexDirection: 'row', gap: space(1.5) },
  flex: { flex: 1 },
  winMoves: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textMuted, textAlign: 'center' },
  newBest: { fontFamily: fonts.bold, fontSize: 16, color: colors.gold, textAlign: 'center' },
  winNote: { fontFamily: fonts.medium, fontSize: 14, color: colors.textFaint, textAlign: 'center' },
  coinRow: { alignItems: 'center' },
});
