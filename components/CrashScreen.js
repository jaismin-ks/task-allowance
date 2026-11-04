// components/CrashScreen.js
// Last-resort screen for an uncaught render error (root ErrorBoundary) or a failed
// database migration. Renders outside the app's providers, so it uses only plain
// layout and the palette — no safe-area context, no navigation.
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { makeStyles, useColors } from '../theme/theme';
import { AppText } from './ui/AppText';
import { Button } from './ui/Button';
import { Icon } from './ui/Icon';

export function CrashScreen({ title, body, error, onRetry, retryLabel = 'Try again' }) {
  const colors = useColors();
  const styles = useStyles();
  const [copied, setCopied] = useState(false);
  const details = `${error?.name ?? 'Error'}: ${error?.message ?? String(error)}`;

  const copy = async () => {
    await Clipboard.setStringAsync(`${details}\n\n${error?.stack ?? ''}`).catch(() => {});
    setCopied(true);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.icon}>
          <Icon name="alert" size={26} color={colors.danger} />
        </View>
        <AppText variant="h1" accessibilityRole="header">{title}</AppText>
        <AppText variant="body" color={colors.textMuted}>{body}</AppText>
        <View style={styles.details}>
          <AppText variant="caption" color={colors.textMuted} selectable numberOfLines={6}>
            {details}
          </AppText>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        {onRetry && <Button label={retryLabel} icon="retry" onPress={onRetry} />}
        <Button
          label={copied ? 'Copied' : 'Copy error details'}
          variant="ghost"
          onPress={copy}
          accessibilityHint="Copies technical details you can send to support"
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.bg, paddingTop: 72, paddingBottom: 40 },
  content: { paddingHorizontal: 24, gap: 14 },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.dangerTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  details: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footer: { paddingHorizontal: 24, gap: 4 },
}));
