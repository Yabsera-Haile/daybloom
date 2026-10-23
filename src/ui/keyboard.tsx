// Keeping what you type above the keyboard. Android draws Daybloom edge to edge, so the screen
// doesn't shrink when the keyboard opens: a scrolling page needs room under its content for the
// keyboard, and the field being typed in has to be scrolled up into view.
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Room left between the field and the top of the keyboard. */
const GAP = 24;

/**
 * How much of the screen the keyboard covers (0 when it's hidden). Android reports the keyboard
 * without the navigation bar under it, so that is added.
 */
export function useKeyboardHeight(): number {
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) =>
      setHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height ? height + (Platform.OS === 'android' ? insets.bottom : 0) : 0;
}

/** Told by a TextField when it gains focus, so the scroll area around it can bring it into view. */
const FieldFocus = createContext<(() => void) | null>(null);

export const useFieldFocus = () => useContext(FieldFocus);

type Props = ScrollViewProps & {
  /** Add room under the content for the keyboard (off where the screen already makes room). */
  roomForKeyboard?: boolean;
};

/**
 * A ScrollView that keeps the field being typed in above the keyboard: when the keyboard opens, and
 * when another field is tapped while it's open.
 */
export const KeyboardScrollView = forwardRef<ScrollView, Props>(function KeyboardScrollView(
  { roomForKeyboard = true, onScroll, contentContainerStyle, scrollEventThrottle, children, ...rest },
  ref,
) {
  const scroll = useRef<ScrollView>(null);
  useImperativeHandle(ref, () => scroll.current as ScrollView);
  const offset = useRef(0);
  const keyboardTop = useRef<number | null>(null);
  const keyboard = useKeyboardHeight();

  const bringIntoView = useCallback(() => {
    const input = TextInput.State.currentlyFocusedInput();
    const top = keyboardTop.current;
    if (!input || top === null || !scroll.current) return;
    input.measureInWindow((_x, y, _w, h) => {
      const overlap = y + h + GAP - top;
      if (overlap > 0) scroll.current?.scrollTo({ y: offset.current + overlap, animated: true });
    });
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      keyboardTop.current = e.endCoordinates.screenY;
      // let the room under the content appear before scrolling into it
      setTimeout(bringIntoView, 60);
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      keyboardTop.current = null;
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [bringIntoView]);

  const focused = useCallback(() => {
    // another field tapped while the keyboard is open
    if (keyboardTop.current !== null) setTimeout(bringIntoView, 60);
  }, [bringIntoView]);

  return (
    <FieldFocus.Provider value={focused}>
      <ScrollView
        ref={scroll}
        scrollEventThrottle={scrollEventThrottle ?? 32}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          offset.current = e.nativeEvent.contentOffset.y;
          onScroll?.(e);
        }}
        contentContainerStyle={[
          contentContainerStyle,
          roomForKeyboard && keyboard ? { paddingBottom: keyboard + GAP } : null,
        ]}
        {...rest}>
        {children}
      </ScrollView>
    </FieldFocus.Provider>
  );
});
