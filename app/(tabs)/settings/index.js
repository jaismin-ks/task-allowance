// app/(tabs)/settings/index.js — S12 Settings. Changes save immediately; no Save button here.
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router, useFocusEffect, useScrollToTop } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCREEN_GUTTER, useBottomChrome } from '../../../components/layout';
import { AccentPicker } from '../../../components/AccentPicker';
import { ResetDataModal } from '../../../components/ResetDataModal';
import { SettingsGroup, SettingsRow } from '../../../components/SettingsList';
import { AppText } from '../../../components/ui/AppText';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
import { TextField } from '../../../components/ui/TextField';
import { Toggle } from '../../../components/ui/Toggle';
import { updateProfile } from '../../../db/operations/userProfile';
import { resetAllData } from '../../../db/operations/wishlist';
import { runCompletionIntegrityCheck } from '../../../lib/devChecks';
import { formatMoney } from '../../../lib/format';
import { deleteAllItemPhotos } from '../../../lib/itemPhotos';
import { flags, usePrefs } from '../../../lib/prefs';
import { isVoiceSupported } from '../../../lib/voiceInput';
import { usePoolStore } from '../../../store/poolStore';
import { useTaskStore } from '../../../store/taskStore';
import { useWishlistStore } from '../../../store/wishlistStore';
import { makeStyles, useColors } from '../../../theme/theme';

const APPEARANCE_OPTIONS = [
  ['system', 'Match system'],
  ['light', 'Light'],
  ['dark', 'Dark'],
];

const MOTION_OPTIONS = [
  ['system', 'Match system'],
  ['reduced', 'Reduced'],
  ['full', 'Full'],
];

export default function SettingsScreen() {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { tabContentPadding } = useBottomChrome();
  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  const { profile, budget, dailyCap, refresh } = usePoolStore();
  const { haptics, setHaptics, motion, setMotion, appearance, setAppearance, accent, setAccent } = usePrefs();
  const [name, setName] = useState(() => {
    const current = usePoolStore.getState().profile?.displayName;
    return current && current !== 'Me' ? current : '';
  });
  const [resetOpen, setResetOpen] = useState(false);
  const [checkResults, setCheckResults] = useState(null);
  const currency = budget.currencyCode;

  useFocusEffect(useCallback(() => refresh(), [refresh]));

  const saveName = () => {
    updateProfile({ displayName: name.trim() || 'Me' });
    refresh();
  };

  const eraseEverything = async () => {
    setResetOpen(false);
    resetAllData();
    deleteAllItemPhotos();
    flags.clearAll();
    usePrefs.setState({ haptics: true, motion: 'system' });
    await AsyncStorage.removeItem('lastKnownMonthKey');
    useTaskStore.getState().load();
    useWishlistStore.getState().loadItems();
    refresh();
    router.replace('/onboarding');
  };

  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: tabContentPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <AppText variant="h1" accessibilityRole="header">Settings</AppText>

        <SettingsGroup title="Allowance">
          <SettingsRow
            label="Monthly allowance"
            value={formatMoney(budget.monthlyAllowanceCap, currency, { trim: true })}
            onPress={() => router.push('/settings/allowance')}
          />
          <SettingsRow label="Currency" value={currency} onPress={() => router.push('/settings/currency')} />
          <SettingsRow
            label="Daily guide"
            value={`≈ ${formatMoney(dailyCap, currency)} today`}
            helper="A suggestion, never a limit."
            accessibilityLabel={`Daily guide, about ${formatMoney(dailyCap, currency)} today. A suggestion, never a limit.`}
            last
          />
        </SettingsGroup>

        <SettingsGroup title="Appearance">
          <View style={styles.motion}>
            <AppText variant="label">Theme</AppText>
            <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Theme">
              {APPEARANCE_OPTIONS.map(([key, label]) => (
                <Chip
                  key={key}
                  label={label}
                  selected={appearance === key}
                  showAddGlyph={false}
                  onPress={() => setAppearance(key)}
                />
              ))}
            </View>
          </View>
          <View style={[styles.motion, styles.topDivider]}>
            <AppText variant="label">Accent colour</AppText>
            <AccentPicker value={accent} onChange={setAccent} />
            <AppText variant="small" color={colors.textMuted}>
              Used for money, progress and buttons. Works in light and dark.
            </AppText>
          </View>
        </SettingsGroup>

        <SettingsGroup title="Preferences">
          <SettingsRow
            label="Voice input"
            helper={isVoiceSupported ? 'Speak tasks instead of typing.' : 'Needs a development build of the app.'}
            right={
              <Toggle
                value={!!profile?.voiceInputEnabled && isVoiceSupported}
                disabled={!isVoiceSupported}
                onValueChange={(v) => {
                  updateProfile({ voiceInputEnabled: v });
                  refresh();
                }}
                accessibilityLabel="Voice input"
                accessibilityHint="Speak tasks instead of typing."
              />
            }
          />
          <SettingsRow
            label="Haptics"
            helper="Vibrate when you complete tasks."
            right={
              <Toggle
                value={haptics}
                onValueChange={setHaptics}
                accessibilityLabel="Haptics"
                accessibilityHint="Vibrate when you complete tasks."
              />
            }
          />
          <View style={styles.motion}>
            <AppText variant="label">Motion</AppText>
            <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Motion">
              {MOTION_OPTIONS.map(([key, label]) => (
                <Chip
                  key={key}
                  label={label}
                  selected={motion === key}
                  showAddGlyph={false}
                  onPress={() => setMotion(key)}
                />
              ))}
            </View>
          </View>
        </SettingsGroup>

        <SettingsGroup title="Profile">
          <View style={styles.inline}>
            <TextField
              label="Your name"
              optional
              placeholder="What should we call you?"
              helper="Used in your greeting."
              value={name}
              onChangeText={setName}
              onBlur={saveName}
              onSubmitEditing={saveName}
              maxLength={30}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>
        </SettingsGroup>

        <SettingsGroup title="Data">
          <SettingsRow label="Reset all data" danger onPress={() => setResetOpen(true)} last />
        </SettingsGroup>

        <SettingsGroup title="About">
          <SettingsRow
            label="How TaskAllowance works"
            onPress={() => router.push({ pathname: '/settings/about', params: { section: 'how' } })}
          />
          <SettingsRow
            label="Privacy"
            onPress={() => router.push({ pathname: '/settings/about', params: { section: 'privacy' } })}
          />
          <SettingsRow
            label="Known limitations"
            onPress={() => router.push({ pathname: '/settings/about', params: { section: 'limits' } })}
          />
          <SettingsRow label="Version" value={Constants.expoConfig?.version ?? '—'} last />
        </SettingsGroup>

        {__DEV__ && (
          <SettingsGroup title="Developer checks">
            <View style={styles.inline}>
              <Button
                label="Run completion integrity check"
                variant="secondary"
                onPress={() => {
                  setCheckResults(runCompletionIntegrityCheck());
                  refresh();
                }}
              />
              {checkResults?.map((r) => (
                <AppText key={r.name} variant="small" color={r.passed ? colors.accentText : colors.danger}>
                  {r.passed ? '✓' : '✗'} {r.name} — {r.detail}
                </AppText>
              ))}
            </View>
          </SettingsGroup>
        )}
      </ScrollView>
      <ResetDataModal visible={resetOpen} onCancel={() => setResetOpen(false)} onConfirm={eraseEverything} />
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: SCREEN_GUTTER, gap: 24 },
  motion: { padding: 16, gap: 10 },
  topDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inline: { padding: 16, gap: 10 },
}));
