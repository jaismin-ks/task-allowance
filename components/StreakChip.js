// components/StreakChip.js
// Tasks header: "4-day streak". Before the first task of the day it nudges
// ("Keep your 4-day streak") instead of celebrating. Tap → Activity.
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { radius, size } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';
import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';

export function StreakChip({ streak }) {
  const colors = useColors();
  const styles = useStyles();
  if (!streak?.current) return null;

  const days = `${streak.current}-day`;
  const atRisk = !streak.doneToday;
  const label = atRisk ? `Keep your ${days} streak` : `${days} streak`;

  return (
    <Pressable
      onPress={() => router.push('/activity')}
      accessibilityRole="button"
      accessibilityLabel={atRisk ? `${label}. Finish a task today to keep it.` : label}
      accessibilityHint="Opens activity"
      hitSlop={6}
      style={({ pressed }) => [styles.chip, atRisk ? styles.atRisk : styles.live, pressed && styles.pressed]}
    >
      <Icon name="flame" size={14} color={atRisk ? colors.warning : colors.accentText} strokeWidth={2} />
      <AppText variant="caption" color={atRisk ? colors.warning : colors.accentText} maxFontSizeMultiplier={1.3}>
        {label.toUpperCase()}
      </AppText>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: size.hit - 12,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  live: { backgroundColor: colors.accentTint, borderColor: colors.accentRing },
  atRisk: { backgroundColor: colors.warningTint, borderColor: colors.warningBorder },
  pressed: { opacity: 0.8 },
}));
