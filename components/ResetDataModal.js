// components/ResetDataModal.js — "Erase everything?" confirm sheet. Typing RESET
// enables the destructive button, so this can't happen from a stray tap.
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';
import { AppText } from './ui/AppText';
import { Button } from './ui/Button';
import { TextField } from './ui/TextField';

export function ResetDataModal({ visible, onCancel, onConfirm }) {
  const colors = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [typed, setTyped] = useState('');
  const ready = typed.trim() === 'RESET';
  const cancel = () => {
    setTyped('');
    onCancel();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cancel} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.scrim} onPress={cancel} accessibilityLabel="Cancel" accessibilityRole="button" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]} accessibilityViewIsModal>
          <AppText variant="h2" accessibilityRole="header">Erase everything?</AppText>
          <AppText variant="body" color={colors.textMuted}>
            This deletes all tasks, wishlist items and history on this phone. It can’t be undone.
          </AppText>
          <TextField
            label="Type RESET to confirm"
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="RESET"
          />
          <Button
            label="Erase everything"
            variant={ready ? 'primary' : 'secondary'}
            style={ready && { backgroundColor: colors.danger, borderColor: colors.danger }}
            disabled={!ready}
            onPress={() => {
              setTyped('');
              onConfirm();
            }}
          />
          <Button label="Cancel" variant="ghost" onPress={cancel} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  flex: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 20,
    gap: 14,
  },
}));
