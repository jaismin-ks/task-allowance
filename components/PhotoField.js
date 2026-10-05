// components/PhotoField.js
// Wishlist item image: pick a photo from the library, take one with the camera,
// or paste an image link (the original option). A picked photo replaces the link.
import { useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { isHttpUrl, isLocalImage } from '../lib/format';
import { pickItemPhoto } from '../lib/itemPhotos';
import { radius } from '../theme/tokens';
import { useColors } from '../theme/theme';
import { ItemImage } from './ItemImage';
import { AppText } from './ui/AppText';
import { Button } from './ui/Button';
import { TextField } from './ui/TextField';

export function PhotoField({ value, onChange, title, linkRef, linkError, onLinkBlur }) {
  const colors = useColors();
  const [busy, setBusy] = useState(null); // 'library' | 'camera' while picking
  const local = isLocalImage(value);
  const hasPreview = local || isHttpUrl(value);

  const pick = async (source) => {
    setBusy(source);
    try {
      const result = await pickItemPhoto(source);
      if (result.status === 'ok') onChange(result.value);
      if (result.status === 'denied') {
        Alert.alert(
          'Camera access is off',
          'Turn it on in Settings to take a photo, or choose one from your library instead.',
          [
            { text: 'Not now', style: 'cancel' },
            ...(result.canAskAgain ? [] : [{ text: 'Open Settings', onPress: () => Linking.openSettings() }]),
          ]
        );
      }
    } catch {
      Alert.alert('Couldn’t add that photo', 'Try another one, or paste an image link instead.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.wrap}>
      <AppText variant="label" accessible={false}>
        Photo <AppText variant="body" color={colors.textMuted}>(optional)</AppText>
      </AppText>

      <View style={styles.row}>
        <ItemImage uri={hasPreview ? value : null} title={title || '?'} style={styles.preview} letterSize={36} />
        <View style={styles.actions}>
          <Button
            label={local ? 'Choose another' : 'Choose photo'}
            icon="image"
            variant="secondary"
            small
            loading={busy === 'library'}
            disabled={!!busy}
            onPress={() => pick('library')}
          />
          <Button
            label="Take photo"
            icon="camera"
            variant="secondary"
            small
            loading={busy === 'camera'}
            disabled={!!busy}
            onPress={() => pick('camera')}
          />
          {hasPreview && (
            <Button
              label={local ? 'Remove photo' : 'Remove image'}
              icon="trash"
              variant="danger"
              small
              onPress={() => onChange('')}
            />
          )}
        </View>
      </View>

      {local ? (
        <AppText variant="small" color={colors.textMuted}>
          Saved on this phone only.
        </AppText>
      ) : (
        <TextField
          ref={linkRef}
          label="Or paste an image link"
          optional
          placeholder="https://…/image.jpg"
          helper="Paste an image address, or leave it blank."
          value={value}
          onChangeText={onChange}
          onBlur={onLinkBlur}
          error={linkError}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  row: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  preview: { width: 112, height: 112, borderRadius: radius.md },
  actions: { flex: 1, gap: 8, alignItems: 'stretch' },
});
