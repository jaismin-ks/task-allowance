// components/ItemImage.js
// Never a broken-image icon: missing or failed images show the title's first letter.
import { Image } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';
import { resolveImageUri } from '../lib/itemPhotos';
import { fonts } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';
import { AppText } from './ui/AppText';

// `uri` is a wishlist image_url value: an https link or a picked photo ("local:…")
export function ItemImage({ uri: value, title, style, letterSize = 32 }) {
  const colors = useColors();
  const styles = useStyles();
  const [failed, setFailed] = useState(false);
  const uri = resolveImageUri(value);
  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={[styles.base, style]}
        contentFit="cover"
        transition={150}
        onError={() => setFailed(true)}
        accessible={false}
      />
    );
  }
  return (
    <View style={[styles.base, styles.placeholder, style]} accessible={false}>
      <AppText style={{ fontFamily: fonts.serif, fontSize: letterSize, lineHeight: letterSize * 1.1 }} color={colors.textMuted}>
        {(title?.trim()?.[0] ?? '?').toUpperCase()}
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  base: { backgroundColor: colors.surfaceRaised, overflow: 'hidden' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
}));
