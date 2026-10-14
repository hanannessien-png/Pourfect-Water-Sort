import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showPrivacyOptions, useAdState } from '@/src/ads/service';
import { BRAND } from '@/src/config/brand';
import { en } from '@/src/i18n/en';
import { Backdrop } from '@/src/render/Backdrop';
import { haptics } from '@/src/services/haptics';
import type { SaveData } from '@/src/state/saveData';
import { useSaveStore } from '@/src/state/useSaveStore';
import { Button } from '@/src/ui/Button';
import { Panel, Toast } from '@/src/ui/bits';
import { ScreenHeader } from '@/src/ui/ScreenHeader';
import { Sheet } from '@/src/ui/Sheet';
import { colors, fonts, radius, space } from '@/src/ui/theme';

type Settings = SaveData['settings'];

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {hint && <Text style={styles.rowHint}>{hint}</Text>}
      </View>
      {children}
    </View>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${label}: ${o.label}`}
            onPress={() => {
              haptics.button();
              onChange(o.value);
            }}
            style={[styles.segItem, on && styles.segItemOn]}
          >
            <Text style={[styles.segText, on && styles.segTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const settings = useSaveStore((s) => s.save.settings);
  const update = useSaveStore((s) => s.update);
  const resetAll = useSaveStore((s) => s.resetAll);
  const [howOpen, setHowOpen] = useState(false);
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    update((s) => ({ ...s, settings: { ...s.settings, [key]: value } }), 'now');

  const privacyRequired = useAdState((st) => st.privacyRequired);

  const switchProps = {
    trackColor: { false: 'rgba(255,255,255,0.18)', true: colors.emeraldDeep },
    thumbColor: colors.goldHi,
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + space(1) }]}>
      <Backdrop />
      <ScreenHeader title={en.settings.title} testID="settings-back" />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + space(4) }]}>
        <Panel>
          <Row title={en.settings.haptics}>
            <Switch
              value={settings.haptics}
              onValueChange={(v) => set('haptics', v)}
              accessibilityLabel={en.settings.haptics}
              testID="settings-haptics"
              {...switchProps}
            />
          </Row>
          <View style={styles.divider} />
          <Row title={en.settings.colorBlind} hint={en.settings.colorBlindHint}>
            <Switch
              value={settings.colorBlind}
              onValueChange={(v) => set('colorBlind', v)}
              accessibilityLabel={en.settings.colorBlind}
              testID="settings-colorblind"
              {...switchProps}
            />
          </Row>
        </Panel>

        <Panel>
          <Text style={styles.rowTitle}>{en.settings.reduceMotion}</Text>
          <Text style={[styles.rowHint, { marginBottom: space(1.5) }]}>{en.settings.reduceMotionHint}</Text>
          <Segmented
            label={en.settings.reduceMotion}
            value={settings.reduceMotion}
            onChange={(v) => set('reduceMotion', v)}
            options={[
              { value: 'auto', label: en.settings.motionAuto },
              { value: 'on', label: en.settings.motionOn },
              { value: 'off', label: en.settings.motionOff },
            ]}
          />
          <Text style={[styles.rowTitle, { marginTop: space(2.5), marginBottom: space(1.5) }]}>{en.settings.graphics}</Text>
          <Segmented
            label={en.settings.graphics}
            value={settings.graphics}
            onChange={(v) => set('graphics', v)}
            options={[
              { value: 'high', label: en.settings.graphicsHigh },
              { value: 'low', label: en.settings.graphicsLow },
            ]}
          />
        </Panel>

        <Panel>
          <Button label={en.settings.howToPlay} icon="help-circle" variant="plum" onPress={() => setHowOpen(true)} />
          {privacyRequired && (
            <Button
              label={en.settings.privacy}
              icon="shield-checkmark"
              variant="plum"
              onPress={() => void showPrivacyOptions()}
              style={{ marginTop: space(1) }}
              accessibilityHint={en.settings.privacyHint}
              testID="settings-privacy"
            />
          )}
          <Button
            label={en.settings.resetProgress}
            icon="trash"
            variant="ghost"
            onPress={() => setResetStep(1)}
            style={{ marginTop: space(1) }}
            testID="settings-reset"
          />
        </Panel>

        <Text style={styles.version}>
          {BRAND.shortName} · {en.settings.version(BRAND.version)}
        </Text>
        <Text style={styles.version}>{BRAND.developer}</Text>
      </ScrollView>

      <View style={[styles.toastSlot, { bottom: insets.bottom + space(4) }]} pointerEvents="none">
        <Toast message={toast?.message ?? null} id={toast?.id ?? 0} />
      </View>

      <Sheet visible={howOpen} title={en.settings.howToPlay} subtitle={en.settings.howToPlayBody} onDismiss={() => setHowOpen(false)}>
        <Button label={en.common.ok} onPress={() => setHowOpen(false)} />
      </Sheet>

      <Sheet visible={resetStep === 1} title={en.settings.resetTitle} subtitle={en.settings.resetBody} onDismiss={() => setResetStep(0)}>
        <Button label={en.settings.resetProgress} variant="ruby" onPress={() => setResetStep(2)} />
        <Button label={en.common.cancel} variant="plum" onPress={() => setResetStep(0)} />
      </Sheet>
      <Sheet visible={resetStep === 2} title={en.settings.resetFinalTitle} subtitle={en.settings.resetFinalBody} onDismiss={() => setResetStep(0)}>
        <Button
          label={en.common.confirm}
          variant="ruby"
          testID="settings-reset-confirm"
          onPress={() => {
            setResetStep(0);
            void resetAll().then(() => setToast((t) => ({ message: en.settings.resetDone, id: (t?.id ?? 0) + 1 })));
          }}
        />
        <Button label={en.common.cancel} variant="plum" onPress={() => setResetStep(0)} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: space(2), gap: space(2) },
  row: { flexDirection: 'row', alignItems: 'center', gap: space(2), minHeight: 48 },
  rowText: { flex: 1 },
  rowTitle: { fontFamily: fonts.display, fontSize: 19, color: colors.text, letterSpacing: 0.3 },
  rowHint: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.cardBorder, marginVertical: space(1) },
  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(247,201,72,0.35)',
    padding: 4,
  },
  segItem: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  segItemOn: { backgroundColor: colors.gold, borderWidth: 1.5, borderColor: colors.goldHi },
  segText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textMuted },
  segTextOn: { color: colors.textOnGold, fontFamily: fonts.display, fontSize: 16 },
  version: { fontFamily: fonts.medium, fontSize: 13, color: colors.textFaint, textAlign: 'center' },
  toastSlot: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
