// components/ProfileButton.js
// Top right of Tasks and Wishlist: your initial in a circle (a person icon until
// you've set a name). Opens Profile & settings — the bottom bar is just Tasks and
// Wishlist, the two places you go every day.
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { usePoolStore } from '../store/poolStore';
import { size as sizes } from '../theme/tokens';
import { makeStyles, useColors } from '../theme/theme';
import { AppText } from './ui/AppText';
import { Icon } from './ui/Icon';

const initialOf = (name) => {
  const n = name?.trim();
  return n && n !== 'Me' ? [...n][0].toUpperCase() : null;
};

export function Avatar({ name, size = 36 }) {
  const colors = useColors();
  const styles = useStyles();
  const initial = initialOf(name);
  return (
    <View
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {initial ? (
        <AppText
          variant="label"
          color={colors.accentText}
          style={{ fontSize: size * 0.42, lineHeight: size * 0.52 }}
          maxFontSizeMultiplier={1}
        >
          {initial}
        </AppText>
      ) : (
        <Icon name="user" size={size * 0.5} color={colors.textMuted} />
      )}
    </View>
  );
}

export function ProfileButton() {
  const styles = useStyles();
  const name = usePoolStore((s) => s.profile?.displayName);
  return (
    <Pressable
      onPress={() => router.push('/settings')}
      accessibilityRole="button"
      accessibilityLabel="Profile and settings"
      hitSlop={4}
      style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
    >
      <Avatar name={name} />
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hit: { minWidth: sizes.hit, minHeight: sizes.hit, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
}));
