import { useCallback, useLayoutEffect, useRef } from 'react';
import type { View } from 'react-native';

import type { NoteFieldProps } from './NoteField.props';

/**
 * Tracks the field's container so the screen can scroll it (input + counter) into view.
 *
 * `containerRef` must keep one identity for the field's whole lifetime: React detaches and
 * re-attaches a callback ref whose identity changes, on every render, so an "unmount" cleanup
 * would fire on each keystroke. It is a `useCallback` with no dependencies (stable with or
 * without the React Compiler, which preserves manual memoization), and it reads the latest
 * `onFieldBlur` through a ref synced after each commit instead of closing over the prop.
 */
export function useNoteField({ onFieldFocus, onFieldBlur }: Pick<NoteFieldProps, 'onFieldFocus' | 'onFieldBlur'>) {
  const container = useRef<View | null>(null);
  const latestOnFieldBlur = useRef(onFieldBlur);
  useLayoutEffect(() => {
    latestOnFieldBlur.current = onFieldBlur;
  });

  const containerRef = useCallback((node: View | null) => {
    container.current = node;
    // React 19 calls the returned cleanup on detach instead of calling the ref with null.
    if (node === null) return undefined;
    return () => {
      container.current = null;
      // The field can unmount while focused (form reset after a save, notes hidden by a tile
      // pick) without an onBlur; forget it so the screen never measures a detached node. The
      // screen's forgetField only clears its focused field when it is this node.
      latestOnFieldBlur.current?.(node);
    };
  }, []);

  return {
    containerRef,
    focus: () => onFieldFocus?.(container.current),
    blur: () => onFieldBlur?.(container.current),
  };
}
