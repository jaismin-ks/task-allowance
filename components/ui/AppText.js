// components/ui/AppText.js
// Every UI string goes through here so Dynamic Type is capped at 160% (spec §7)
// and type styles come from the Figma scale.
import { Text } from 'react-native';
import { MAX_FONT_SCALE, type } from '../../theme/tokens';
import { useColors } from '../../theme/theme';

export function AppText({ variant = 'body', color, style, ...props }) {
  const colors = useColors();
  return (
    <Text
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      style={[type[variant], { color: color ?? colors.text }, style]}
      {...props}
    />
  );
}
