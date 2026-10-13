import { useRef } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView, View } from 'react-native';

/** Space kept between a revealed element and the edge of the scroll viewport. */
export const SCROLL_REVEAL_MARGIN = 16;

/**
 * Keeps elements of a vertical ScrollView visible: the focused text field above the keyboard
 * (after `KeyboardAvoidingView` shrinks the viewport) and a row the screen wants to show (e.g.
 * the first validation error).
 *
 * Wire `scrollRef`, `onScroll` (with `scrollEventThrottle`) and `onLayout` onto the ScrollView,
 * and `contentRef` onto one View that wraps all of its content (positions are measured against
 * it). Call `revealField` from a field's `onFocus` with the field's container view and
 * `forgetField` from its `onBlur`. The viewport's `onLayout` fires again when the keyboard
 * resizes it, which re-reveals the focused field.
 */
export function useScrollIntoView() {
  const scrollRef = useRef<ScrollView>(null);
  const contentRef = useRef<View>(null);
  const offsetY = useRef(0);
  const viewportHeight = useRef(0);
  const focusedField = useRef<View | null>(null);

  const scrollTo = (y: number) => scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: true });

  /** Scrolls the least distance that shows content-relative `[top, top + height]`. */
  const scrollIntoView = (top: number, height: number) => {
    const viewTop = offsetY.current;
    const viewBottom = viewTop + viewportHeight.current;
    const wantedTop = top - SCROLL_REVEAL_MARGIN;
    const wantedBottom = top + height + SCROLL_REVEAL_MARGIN;
    if (wantedTop < viewTop) {
      scrollTo(wantedTop);
    } else if (wantedBottom > viewBottom) {
      // Never push the element's top out of view when it is taller than the viewport.
      scrollTo(Math.min(wantedTop, wantedBottom - viewportHeight.current));
    }
  };

  const revealFocusedField = () => {
    const field = focusedField.current;
    const content = contentRef.current;
    if (field === null || content === null || viewportHeight.current === 0) return;
    field.measureLayout(content, (_x, y, _width, height) => scrollIntoView(y, height));
  };

  return {
    scrollRef,
    contentRef,
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      offsetY.current = event.nativeEvent.contentOffset.y;
    },
    onLayout: (event: LayoutChangeEvent) => {
      const height = event.nativeEvent.layout.height;
      if (height === viewportHeight.current) return;
      viewportHeight.current = height;
      revealFocusedField();
    },
    revealField: (field: View | null) => {
      focusedField.current = field;
      revealFocusedField();
    },
    forgetField: (field: View | null) => {
      if (focusedField.current === field) focusedField.current = null;
    },
    scrollIntoView,
  };
}
