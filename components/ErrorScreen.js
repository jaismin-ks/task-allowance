// components/ErrorScreen.js
// Last-resort screen for a render crash (the root ErrorBoundary) or a failed
// database migration. Deliberately plain: system font and core components only,
// so it still renders when fonts, navigation or the theme fonts are what broke.
// There's no crash reporting, so "Copy error details" is how a bug reaches you.
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme/theme';

export function errorDetails(error) {
  return [
    `TaskAllowance ${Constants.expoConfig?.version ?? '?'} · ${Platform.OS} ${Platform.Version}`,
    `${error?.name ?? 'Error'}: ${error?.message ?? String(error)}`,
    error?.stack ? String(error.stack).split('\n').slice(0, 12).join('\n') : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function ErrorScreen({ title, body, error, onRetry, retryLabel = 'Try again' }) {
  const colors = useColors();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await Clipboard.setStringAsync(errorDetails(error));
    setCopied(true);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}
      accessibilityViewIsModal
    >
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header" maxFontSizeMultiplier={1.6}>
          {title}
        </Text>
        <Text style={[styles.body, { color: colors.textMuted }]} maxFontSizeMultiplier={1.6}>
          {body}
        </Text>
      </View>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={[styles.buttonText, { color: colors.onAccent }]} maxFontSizeMultiplier={1.6}>
            {retryLabel}
          </Text>
        </Pressable>
      )}
      <Pressable
        onPress={copy}
        accessibilityRole="button"
        accessibilityHint="Copies technical details you can send with a bug report."
        style={({ pressed }) => [styles.button, styles.secondary, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
      >
        <Text style={[styles.buttonText, { color: colors.text }]} maxFontSizeMultiplier={1.6}>
          {copied ? 'Copied' : 'Copy error details'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 12 },
  copy: { gap: 10, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 24 },
  button: { minHeight: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  secondary: { borderWidth: 1 },
  buttonText: { fontSize: 17, fontWeight: '600' },
});
