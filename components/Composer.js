// components/Composer.js
// Fixed above the tab bar on Tasks. Text area → Add task sheet; mic → Voice capture.
// Mic is hidden when Voice input is off or unavailable (voice is never the only way in).
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { radius, size } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';
import { SCREEN_GUTTER, useBottomChrome } from './layout';
import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';

export function Composer({ showMic }) {
  const colors = useColors();
  const styles = useStyles();
  const { composerBottom } = useBottomChrome();
  return (
    <View style={[styles.bar, { bottom: composerBottom }]}>
      <BlurView intensity={40} tint={colors.mode} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.glass]} />
      <Pressable
        onPress={() => router.push('/task/new')}
        accessibilityRole="button"
        accessibilityLabel="Add a task"
        style={styles.input}
      >
        <Icon name="plus" size={20} color={colors.textMuted} />
        <AppText variant="bodyLarge" color={colors.textMuted}>Add a task</AppText>
      </Pressable>
      {showMic && (
        <Pressable
          onPress={() => router.push('/voice')}
          accessibilityRole="button"
          accessibilityLabel="Add a task by voice"
          style={({ pressed }) => [styles.mic, pressed && { opacity: 0.85 }]}
        >
          <Icon name="mic" size={20} color={colors.onAccent} />
        </Pressable>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  bar: {
    position: 'absolute',
    left: SCREEN_GUTTER,
    right: SCREEN_GUTTER,
    height: size.composer,
    borderRadius: radius.pill,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 6,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  glass: { backgroundColor: colors.glass },
  input: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  mic: {
    width: size.hit,
    height: size.hit,
    borderRadius: size.hit / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
