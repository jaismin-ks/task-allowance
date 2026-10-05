// lib/voiceInput.js
import { isRunningInExpoGo } from 'expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { usePoolStore } from '../store/poolStore';
import { durations } from '../theme/motion';

// expo-speech-recognition is a native module: importing it in Expo Go throws.
// Load it lazily so the rest of the app keeps working in Expo Go, and hide the
// mic there. It works in a development build (`npx expo run:ios` / `run:android`).
let SpeechModule = null;
if (!isRunningInExpoGo()) {
  try {
    SpeechModule = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
  } catch {
    SpeechModule = null;
  }
}

export const isVoiceSupported = SpeechModule != null;

// Mic buttons show only when the device supports it AND Voice input is on in Settings
export function useVoiceAvailable() {
  const enabled = usePoolStore((s) => s.profile?.voiceInputEnabled ?? true);
  return isVoiceSupported && enabled;
}

// S4 capture state machine:
//   'checking' → 'explain' (permission not asked yet) | 'denied' | 'listening'
//   'listening' → 'review' (heard something) | 'nothing' (5s silence / no speech)
export function useSpeechCapture() {
  const [phase, setPhase] = useState('checking');
  const [transcript, setTranscript] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const finalParts = useRef([]);
  const textRef = useRef('');
  const silenceTimer = useRef(null);
  const startedAt = useRef(0);

  const clearSilence = () => clearTimeout(silenceTimer.current);
  const armSilence = useCallback(() => {
    clearTimeout(silenceTimer.current);
    silenceTimer.current = setTimeout(() => SpeechModule?.stop(), durations.VOICE_SILENCE_MS);
  }, []);

  const begin = useCallback(() => {
    finalParts.current = [];
    textRef.current = '';
    setTranscript('');
    setElapsed(0);
    SpeechModule.start({ lang: 'en-US', interimResults: true, continuous: true, addsPunctuation: true });
  }, []);

  useEffect(() => {
    if (!SpeechModule) return undefined;
    const subs = [
      SpeechModule.addListener('start', () => {
        startedAt.current = Date.now();
        setPhase('listening');
        armSilence();
        AccessibilityInfo.announceForAccessibility('Listening');
      }),
      SpeechModule.addListener('result', (event) => {
        const text = event.results[0]?.transcript?.trim() ?? '';
        if (event.isFinal) {
          if (text) finalParts.current.push(text);
          textRef.current = finalParts.current.join(' ');
        } else {
          textRef.current = [...finalParts.current, text].filter(Boolean).join(' ');
        }
        setTranscript(textRef.current);
        armSilence();
      }),
      SpeechModule.addListener('end', () => {
        clearSilence();
        AccessibilityInfo.announceForAccessibility('Stopped');
        setPhase(textRef.current.trim() ? 'review' : 'nothing');
      }),
      SpeechModule.addListener('error', (event) => {
        clearSilence();
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') setPhase('denied');
        else if (event.error !== 'aborted') setPhase(textRef.current.trim() ? 'review' : 'nothing');
      }),
    ];
    return () => {
      clearSilence();
      subs.forEach((s) => s.remove());
      SpeechModule.abort();
    };
  }, [armSilence]);

  // Elapsed "0:04" while listening
  useEffect(() => {
    if (phase !== 'listening') return undefined;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 500);
    return () => clearInterval(t);
  }, [phase]);

  // Explain before the OS prompt: only start straight away if already granted
  useEffect(() => {
    if (!SpeechModule) return;
    SpeechModule.getPermissionsAsync().then((perm) => {
      if (perm.granted) begin();
      else setPhase(perm.canAskAgain ? 'explain' : 'denied');
    });
  }, [begin]);

  const requestAndStart = useCallback(async () => {
    const perm = await SpeechModule.requestPermissionsAsync();
    if (perm.granted) begin();
    else setPhase('denied');
  }, [begin]);

  return {
    phase,
    transcript,
    elapsed,
    stop: () => SpeechModule?.stop(),
    retry: begin,
    requestAndStart,
  };
}
