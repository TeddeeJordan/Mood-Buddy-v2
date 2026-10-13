import { renderHook } from '@testing-library/react-native';
import type { View } from 'react-native';

import { useNoteField } from '@/ui/components/NoteField/useNoteField';

const node = (name: string) => ({ name }) as unknown as View;

describe('useNoteField', () => {
  it('keeps one containerRef identity across re-renders, even when onFieldBlur changes', async () => {
    const { result, rerender } = await renderHook(
      (props: { onFieldBlur: () => void }) => useNoteField({ onFieldBlur: props.onFieldBlur }),
      { initialProps: { onFieldBlur: () => undefined } },
    );
    const first = result.current.containerRef;
    await rerender({ onFieldBlur: () => undefined });
    await rerender({ onFieldBlur: () => undefined });
    expect(result.current.containerRef).toBe(first);
  });

  it('returns a cleanup from containerRef that calls onFieldBlur once with the node', async () => {
    const onFieldBlur = jest.fn();
    const { result } = await renderHook(() => useNoteField({ onFieldBlur }));
    const n = node('a');
    const cleanup = result.current.containerRef(n) as () => void;
    expect(typeof cleanup).toBe('function');
    expect(onFieldBlur).not.toHaveBeenCalled();
    cleanup();
    expect(onFieldBlur).toHaveBeenCalledTimes(1);
    expect(onFieldBlur).toHaveBeenCalledWith(n);
  });

  it('returns no cleanup when called with null', async () => {
    const { result } = await renderHook(() => useNoteField({}));
    expect(result.current.containerRef(null)).toBeUndefined();
  });

  it('reports the container to focus and blur callbacks', async () => {
    const onFieldFocus = jest.fn();
    const onFieldBlur = jest.fn();
    const { result } = await renderHook(() => useNoteField({ onFieldFocus, onFieldBlur }));
    const n = node('a');
    result.current.containerRef(n);
    result.current.focus();
    expect(onFieldFocus).toHaveBeenCalledWith(n);
    result.current.blur();
    expect(onFieldBlur).toHaveBeenCalledWith(n);
  });

  it('reports null before the container is attached and after it is cleaned up', async () => {
    const onFieldFocus = jest.fn();
    const { result } = await renderHook(() => useNoteField({ onFieldFocus }));
    result.current.focus();
    expect(onFieldFocus).toHaveBeenLastCalledWith(null);
    const cleanup = result.current.containerRef(node('a')) as () => void;
    cleanup();
    result.current.focus();
    expect(onFieldFocus).toHaveBeenLastCalledWith(null);
  });

  it('uses the latest onFieldBlur in the cleanup after a re-render', async () => {
    const first = jest.fn();
    const second = jest.fn();
    const { result, rerender } = await renderHook(
      (props: { onFieldBlur: () => void }) => useNoteField({ onFieldBlur: props.onFieldBlur }),
      { initialProps: { onFieldBlur: first } },
    );
    const cleanup = result.current.containerRef(node('a')) as () => void;
    await rerender({ onFieldBlur: second });
    cleanup();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('does not throw when no callbacks are given', async () => {
    const { result } = await renderHook(() => useNoteField({}));
    const cleanup = result.current.containerRef(node('a')) as () => void;
    expect(() => {
      result.current.focus();
      result.current.blur();
      cleanup();
    }).not.toThrow();
  });
});
