// components/StreakChip.js
// Tasks header: "🔥 4-day streak", shown only as a win — at least 2 days in a row
// and today already counted. No "keep your streak" warning on screen; the evening
// reminder does the nudging (docs/UX_REVIEW.md: celebrate, don't warn).
import { View } from 'react-native';
import { makeStyles, useColors } from '../theme/theme';
import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';

export const MIN_STREAK_SHOWN = 2;

export function StreakChip({ streak }) {
  const colors = useColors();
  const styles = useStyles();
  if (!streak?.doneToday || streak.current < MIN_STREAK_SHOWN) return null;
  return (
    <View style={styles.row} accessible accessibilityLabel={`${streak.current}-day streak`}>
      <Icon name="flame" size={13} color={colors.accentText} strokeWidth={2} />
      <AppText variant="small" color={colors.accentText} maxFontSizeMultiplier={1.3}>
        {streak.current}-day streak
      </AppText>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
}));
