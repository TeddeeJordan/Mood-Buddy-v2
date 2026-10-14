import { act, renderHook } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { FONT_SCALE_RELAYOUT_DELAY_MS } from '@/constants/textScaling';
import { useFontScaleRelayoutPass } from '@/hooks/useFontScaleRelayoutPass';

function setFontScale(fontScale: number) {
  const window = Dimensions.get('window');
  Dimensions.set({ window: { ...window, fontScale }, screen: { ...Dimensions.get('screen'), fontScale } });
}

beforeEach(() => {
  jest.useFakeTimers();
  setFontScale(1);
});
afterEach(() => {
  jest.useRealTimers();
  setFontScale(1);
});

describe('useFontScaleRelayoutPass', () => {
  it('starts at 0 and stays there while the font scale does not change', async () => {
    const { result } = await renderHook(() => useFontScaleRelayoutPass());
    expect(result.current).toBe(0);
    await act(async () => {
      jest.advanceTimersByTime(FONT_SCALE_RELAYOUT_DELAY_MS * 3);
    });
    expect(result.current).toBe(0);
  });

  it('adds one pass when the font scale changes', async () => {
    const { result } = await renderHook(() => useFontScaleRelayoutPass());
    await act(async () => setFontScale(1.5));
    expect(result.current).toBe(1);
  });

  it('adds a second pass after FONT_SCALE_RELAYOUT_DELAY_MS', async () => {
    const { result } = await renderHook(() => useFontScaleRelayoutPass());
    await act(async () => setFontScale(1.5));
    await act(async () => {
      jest.advanceTimersByTime(FONT_SCALE_RELAYOUT_DELAY_MS - 1);
    });
    expect(result.current).toBe(1);
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe(2);
    await act(async () => {
      jest.advanceTimersByTime(FONT_SCALE_RELAYOUT_DELAY_MS * 5);
    });
    expect(result.current).toBe(2);
  });

  it('restarts the delay when the scale changes again before it fires', async () => {
    const { result } = await renderHook(() => useFontScaleRelayoutPass());
    await act(async () => setFontScale(1.5));
    await act(async () => {
      jest.advanceTimersByTime(FONT_SCALE_RELAYOUT_DELAY_MS - 100);
    });
    await act(async () => setFontScale(2));
    expect(result.current).toBe(2);
    // The first timer was cleared: the original deadline passes without a late pass.
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe(2);
    await act(async () => {
      jest.advanceTimersByTime(FONT_SCALE_RELAYOUT_DELAY_MS);
    });
    expect(result.current).toBe(3);
  });

  it('clears the pending timer on unmount, so no late pass fires', async () => {
    const setSpy = jest.spyOn(globalThis, 'setTimeout');
    const clearSpy = jest.spyOn(globalThis, 'clearTimeout');
    const { result, unmount } = await renderHook(() => useFontScaleRelayoutPass());
    await act(async () => setFontScale(1.5));
    const call = setSpy.mock.calls.findIndex(([, delay]) => delay === FONT_SCALE_RELAYOUT_DELAY_MS);
    expect(call).toBeGreaterThanOrEqual(0);
    const handle = setSpy.mock.results[call].value;
    await unmount();
    expect(clearSpy).toHaveBeenCalledWith(handle);
    expect(result.current).toBe(1);
  });

  it('alternates parity across consecutive passes', async () => {
    const { result } = await renderHook(() => useFontScaleRelayoutPass());
    const seen = [result.current];
    await act(async () => setFontScale(1.3));
    seen.push(result.current);
    await act(async () => {
      jest.advanceTimersByTime(FONT_SCALE_RELAYOUT_DELAY_MS);
    });
    seen.push(result.current);
    expect(seen.map((n) => n % 2)).toEqual([0, 1, 0]);
  });
});
