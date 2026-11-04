// app/voice.js — S4 Voice capture (full-screen modal, explicit close only).
// Fills the Task field; never saves anything by itself.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Linking, Pressable, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../components/ui/AppText';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/Headers';
import { Icon } from '../components/ui/Icon';
import { useReducedMotion } from '../lib/prefs';
import { isVoiceSupported, useSpeechCapture } from '../lib/voiceInput';
import { useUiStore } from '../store/uiStore';
import { timings } from '../theme/motion';
import { radius } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';

const MIC = 112;

export default function VoiceScreen() {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { from } = useLocalSearchParams();
  const voice = useSpeechCapture();

  const close = () => router.back();
  const typeInstead = () =>
    from === 'sheet' ? router.back() : router.replace('/task/new');

  const useThis = () => {
    const title = voice.transcript.trim();
    if (from === 'sheet') {
      useUiStore.getState().setVoiceDraft(title);
      router.back();
    } else {
      router.replace({ pathname: '/task/new', params: { title, source: 'voice' } });
    }
  };

  const mins = Math.floor(voice.elapsed / 60);
  const secs = String(voice.elapsed % 60).padStart(2, '0');

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.topRow}>
        {voice.phase === 'listening' ? (
          <View style={styles.status} accessibilityLiveRegion="polite">
            <View style={styles.dot} />
            <AppText variant="small" color={colors.text}>
              Listening · {mins}:{secs}
            </AppText>
          </View>
        ) : (
          <View />
        )}
        <IconButton icon="close" label="Cancel voice input" onPress={close} />
      </View>

      {!isVoiceSupported ? (
        <Message
          title="Voice input isn’t available here"
          body="It needs a development build of the app. You can type your task instead."
        >
          <Button label="Type instead" onPress={typeInstead} />
        </Message>
      ) : voice.phase === 'explain' ? (
        <Message
          icon="mic"
          title="Speak your tasks"
          body="TaskAllowance needs the microphone to turn speech into tasks. Audio isn’t saved."
        >
          <Button label="Allow microphone" onPress={voice.requestAndStart} />
          <Button label="Type instead" variant="ghost" onPress={typeInstead} />
        </Message>
      ) : voice.phase === 'denied' ? (
        <Message
          icon="mic"
          title="Microphone access is off"
          body="Microphone access is off. Turn it on in Settings, or type your task instead."
        >
          <Button label="Open Settings" onPress={() => Linking.openSettings()} />
          <Button label="Type instead" variant="ghost" onPress={typeInstead} />
        </Message>
      ) : voice.phase === 'nothing' ? (
        <Message title="Didn’t catch that." body="Try again, a little closer to the mic.">
          <Button label="Try again" icon="mic" onPress={voice.retry} />
          <Button label="Type instead" variant="ghost" onPress={typeInstead} />
        </Message>
      ) : voice.phase === 'review' ? (
        <View style={styles.reviewWrap}>
          <View style={styles.card}>
            <AppText variant="small" color={colors.textMuted}>We heard</AppText>
            <AppText variant="h1">{voice.transcript}</AppText>
          </View>
          <View style={styles.actions}>
            <Button label="Use this" arrow onPress={useThis} />
            <Button label="Try again" variant="secondary" icon="mic" onPress={voice.retry} />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.transcriptWrap}>
            <AppText
              variant="displayItalic"
              color={voice.transcript ? colors.text : colors.textMuted}
              accessibilityLiveRegion="polite"
            >
              {voice.transcript || 'Say a task, like “fold laundry”…'}
            </AppText>
          </View>
          <View style={styles.micWrap}>
            <MicButton listening={voice.phase === 'listening'} onPress={voice.stop} />
          </View>
          <AppText variant="small" color={colors.textMuted} style={styles.center}>
            Tap to stop. We’ll stop on our own after 5 seconds of quiet.
          </AppText>
        </>
      )}
    </View>
  );
}

function Message({ icon, title, body, children }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={styles.message}>
      {icon && (
        <View style={styles.msgIcon}>
          <Icon name={icon} size={28} color={colors.accentText} />
        </View>
      )}
      <AppText variant="h1" style={styles.center} accessibilityRole="header">{title}</AppText>
      <AppText variant="bodyLarge" color={colors.textMuted} style={styles.center}>{body}</AppText>
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

// Pulse rings are translucent lime (the Figma frame renders them as solid circles)
function MicButton({ listening, onPress }) {
  const colors = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  return (
    <View style={styles.micArea}>
      {listening && !reduced && (
        <>
          <PulseRing delay={0} />
          <PulseRing delay={timings.PULSE_MS / 2} />
        </>
      )}
      {listening && reduced && <View style={[styles.ring, styles.staticRing]} />}
      <Pressable
        onPress={onPress}
        disabled={!listening}
        accessibilityRole="button"
        accessibilityLabel="Stop listening"
        style={({ pressed }) => [styles.mic, pressed && { opacity: 0.85 }]}
      >
        <Icon name={listening ? 'stop' : 'mic'} size={36} color={colors.onAccent} fill={listening ? colors.onAccent : 'none'} />
      </Pressable>
    </View>
  );
}

function PulseRing({ delay }) {
  const styles = useStyles();
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(delay, withRepeat(withTiming(1, { duration: timings.PULSE_MS, easing: Easing.out(Easing.quad) }), -1)));
    return () => cancelAnimation(p);
  }, [delay, p]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - p.get()),
    transform: [{ scale: 1 + p.get() * 0.9 }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.ring, style]} />;
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  transcriptWrap: { flex: 1, justifyContent: 'center' },
  micWrap: { alignItems: 'center', marginBottom: 24 },
  micArea: { width: MIC * 2, height: MIC * 2, alignItems: 'center', justifyContent: 'center' },
  mic: {
    width: MIC,
    height: MIC,
    borderRadius: MIC / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: MIC,
    height: MIC,
    borderRadius: MIC / 2,
    backgroundColor: colors.accentRing,
    borderWidth: 1,
    borderColor: colors.accentGlow,
  },
  staticRing: { width: MIC * 1.4, height: MIC * 1.4, borderRadius: MIC * 0.7 },
  center: { textAlign: 'center' },
  reviewWrap: { flex: 1, justifyContent: 'flex-end', gap: 24 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 10,
  },
  actions: { gap: 10, alignSelf: 'stretch' },
  message: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  msgIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
