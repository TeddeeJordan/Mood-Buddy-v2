import { act, renderHook } from '@testing-library/react-native';
import type { View } from 'react-native';

import { SCROLL_REVEAL_MARGIN, useScrollIntoView } from '@/hooks/useScrollIntoView';

const layoutEvent = (height: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width: 300, height } } }) as never;
const scrollEvent = (y: number) => ({ nativeEvent: { contentOffset: { x: 0, y } } }) as never;

function fakeField(y: number, height: number) {
  const measureLayout = jest.fn((_content: unknown, onSuccess: (...a: number[]) => void) => onSuccess(0, y, 300, height));
  return { node: { measureLayout } as unknown as View, measureLayout };
}

async function setup(viewport = 400, offset = 0) {
  const hook = await renderHook(() => useScrollIntoView());
  const scrollTo = jest.fn();
  (hook.result.current.scrollRef as { current: unknown }).current = { scrollTo };
  (hook.result.current.contentRef as { current: unknown }).current = {};
  await act(async () => {
    hook.result.current.onScroll(scrollEvent(offset));
    hook.result.current.onLayout(layoutEvent(viewport));
  });
  return { ...hook, scrollTo };
}

describe('useScrollIntoView', () => {
  it('uses a 16pt margin', () => {
    expect(SCROLL_REVEAL_MARGIN).toBe(16);
  });

  it('does not scroll to content already inside the viewport with margin', async () => {
    const { result, scrollTo } = await setup(400, 0);
    result.current.scrollIntoView(100, 50);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('scrolls up so the element top sits one margin below the viewport top', async () => {
    const { result, scrollTo } = await setup(400, 300);
    result.current.scrollIntoView(100, 50);
    expect(scrollTo).toHaveBeenCalledWith({ y: 100 - SCROLL_REVEAL_MARGIN, animated: true });
  });

  it('never scrolls above zero', async () => {
    const { result, scrollTo } = await setup(400, 300);
    result.current.scrollIntoView(5, 20);
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
  });

  it('scrolls down just enough to show the element bottom plus the margin', async () => {
    const { result, scrollTo } = await setup(400, 0);
    result.current.scrollIntoView(500, 50);
    expect(scrollTo).toHaveBeenCalledWith({ y: 500 + 50 + SCROLL_REVEAL_MARGIN - 400, animated: true });
  });

  it('keeps the top of an element taller than the viewport in view', async () => {
    const { result, scrollTo } = await setup(400, 0);
    result.current.scrollIntoView(500, 600);
    expect(scrollTo).toHaveBeenCalledWith({ y: 500 - SCROLL_REVEAL_MARGIN, animated: true });
  });

  it('reveals a focused field using its layout measured against the content view', async () => {
    const { result, scrollTo } = await setup(400, 0);
    const field = fakeField(600, 40);
    await act(async () => result.current.revealField(field.node));
    expect(field.measureLayout).toHaveBeenCalledWith(result.current.contentRef.current, expect.any(Function));
    expect(scrollTo).toHaveBeenCalledWith({ y: 600 + 40 + SCROLL_REVEAL_MARGIN - 400, animated: true });
  });

  it('re-reveals the focused field when the viewport height changes (keyboard)', async () => {
    const { result, scrollTo } = await setup(800, 0);
    const field = fakeField(600, 40);
    await act(async () => result.current.revealField(field.node));
    expect(scrollTo).not.toHaveBeenCalled(); // fits in the tall viewport
    await act(async () => result.current.onLayout(layoutEvent(400)));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ y: 256, animated: true });
  });

  it('ignores a layout event with an unchanged height', async () => {
    const { result } = await setup(400, 0);
    const field = fakeField(600, 40);
    await act(async () => result.current.revealField(field.node));
    field.measureLayout.mockClear();
    await act(async () => result.current.onLayout(layoutEvent(400)));
    expect(field.measureLayout).not.toHaveBeenCalled();
  });

  it('stops tracking a field after it blurs', async () => {
    const { result, scrollTo } = await setup(800, 0);
    const field = fakeField(600, 40);
    await act(async () => result.current.revealField(field.node));
    await act(async () => result.current.forgetField(field.node));
    await act(async () => result.current.onLayout(layoutEvent(400)));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('keeps tracking the current field when another field blurs late', async () => {
    const { result, scrollTo } = await setup(800, 0);
    const a = fakeField(600, 40);
    const b = fakeField(650, 40);
    await act(async () => result.current.revealField(a.node));
    await act(async () => result.current.revealField(b.node));
    await act(async () => result.current.forgetField(a.node));
    await act(async () => result.current.onLayout(layoutEvent(400)));
    expect(scrollTo).toHaveBeenCalledWith({ y: 650 + 40 + SCROLL_REVEAL_MARGIN - 400, animated: true });
  });

  it('leaves the newly focused field in place when a field that is no longer focused is forgotten', async () => {
    const { result, scrollTo } = await setup(800, 0);
    const a = fakeField(600, 40);
    const b = fakeField(650, 40);
    await act(async () => result.current.revealField(a.node));
    await act(async () => result.current.revealField(b.node));
    await act(async () => result.current.forgetField(a.node));
    b.measureLayout.mockClear();
    await act(async () => result.current.onLayout(layoutEvent(400)));
    expect(b.measureLayout).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('does not measure before the viewport has a height', async () => {
    const { result } = await renderHook(() => useScrollIntoView());
    (result.current.contentRef as { current: unknown }).current = {};
    const field = fakeField(600, 40);
    await act(async () => result.current.revealField(field.node));
    expect(field.measureLayout).not.toHaveBeenCalled();
  });

  it('does not measure without a content view or a field', async () => {
    const { result } = await setup(400, 0);
    (result.current.contentRef as { current: unknown }).current = null;
    const field = fakeField(600, 40);
    await act(async () => result.current.revealField(field.node));
    expect(field.measureLayout).not.toHaveBeenCalled();
    await act(async () => result.current.revealField(null));
  });

  it('does nothing and does not throw when the scroll view ref is unset', async () => {
    const { result } = await renderHook(() => useScrollIntoView());
    await act(async () => result.current.onLayout(layoutEvent(400)));
    expect(() => result.current.scrollIntoView(900, 50)).not.toThrow();
  });

  it('holds no listeners to clean up: unmounting after a reveal is safe', async () => {
    const { result, unmount } = await setup(400, 0);
    const field = fakeField(600, 40);
    await act(async () => result.current.revealField(field.node));
    await unmount();
    expect(field.measureLayout).toHaveBeenCalledTimes(1);
  });
});
