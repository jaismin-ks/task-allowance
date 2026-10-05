// components/ui/EmptyState.js
import { View } from 'react-native';
import { radius } from '../../theme/tokens';
import { makeStyles, useColors } from '../../theme/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export function EmptyState({ icon, headline, body, children }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={styles.wrap}>
      {icon && (
        <View style={styles.iconWrap}>
          <Icon name={icon} size={24} color={colors.accentText} />
        </View>
      )}
      <AppText variant="h2" style={styles.center} accessibilityRole="header">
        {headline}
      </AppText>
      {body && (
        <AppText variant="body" color={colors.textMuted} style={styles.center}>
          {body}
        </AppText>
      )}
      {children && <View style={styles.actions}>{children}</View>}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  center: { textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: 10, marginTop: 12 },
}));
