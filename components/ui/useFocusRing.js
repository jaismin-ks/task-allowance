// components/ui/useFocusRing.js
// 2pt focus outline, 3pt offset, for keyboard / Switch Control users (Figma a11y checklist).
import { useState } from 'react';
import { useColors } from '../../theme/theme';

export function useFocusRing(borderRadius) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  return {
    focusProps: { onFocus: () => setFocused(true), onBlur: () => setFocused(false) },
    ring: focused
      ? {
          position: 'absolute',
          top: -3,
          left: -3,
          right: -3,
          bottom: -3,
          borderWidth: 2,
          borderColor: colors.focus,
          borderRadius: borderRadius + 3,
        }
      : null,
  };
}
