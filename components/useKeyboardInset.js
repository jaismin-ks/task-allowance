// components/useKeyboardInset.js
// How much of the bottom of an iOS form sheet the keyboard covers. A sheet's
// bottom sits on the screen's bottom edge, so that's the whole keyboard height.
// KeyboardAvoidingView measures its own frame relative to the sheet, not the
// screen, so it under-pads and the keyboard covered the primary button.
// Android resizes the window for the keyboard itself (adjustResize), so 0 there.
import { useEffect, useState } from 'react';
import { Keyboard, LayoutAnimation, Platform } from 'react-native';

export function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'ios') return undefined;
    const animate = (e) =>
      LayoutAnimation.configureNext({
        duration: e?.duration || 250,
        update: { type: LayoutAnimation.Types.keyboard },
      });
    const show = Keyboard.addListener('keyboardWillShow', (e) => {
      animate(e);
      setInset(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardWillHide', (e) => {
      animate(e);
      setInset(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return inset;
}
