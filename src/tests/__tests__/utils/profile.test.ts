import { BIO_LIMIT } from '@/constants/limits';
import { bioCounterAccessibilityLabel, bioCounterLabel, clampBio, isBioAtLimit } from '@/utils/profile';

describe('clampBio', () => {
  it('leaves text under the limit alone', () => {
    expect(clampBio('hello')).toBe('hello');
    expect(clampBio('')).toBe('');
  });

  it('leaves text exactly at the limit alone', () => {
    const text = 'a'.repeat(BIO_LIMIT);
    expect(clampBio(text)).toBe(text);
  });

  it('cuts text over the limit', () => {
    expect(clampBio('a'.repeat(BIO_LIMIT + 1))).toBe('a'.repeat(BIO_LIMIT));
  });

  it('cuts a pasted text far over the limit, keeping the start', () => {
    const pasted = 'x'.repeat(BIO_LIMIT) + 'y'.repeat(5000);
    const result = clampBio(pasted);
    expect(result).toHaveLength(BIO_LIMIT);
    expect(result).toBe('x'.repeat(BIO_LIMIT));
  });
});

describe('counter labels', () => {
  it('bioCounterLabel is "n / limit"', () => {
    expect(bioCounterLabel(12)).toBe('12 / 1000');
    expect(bioCounterLabel(0)).toBe('0 / 1000');
  });

  it('bioCounterAccessibilityLabel spells it out', () => {
    expect(bioCounterAccessibilityLabel(12)).toBe('12 of 1000 characters used');
  });
});

describe('isBioAtLimit', () => {
  it.each([
    [0, false],
    [BIO_LIMIT - 1, false],
    [BIO_LIMIT, true],
    [BIO_LIMIT + 1, true],
  ])('length %i -> %s', (length, expected) => {
    expect(isBioAtLimit(length)).toBe(expected);
  });

  it('uses a limit of 1000', () => {
    expect(BIO_LIMIT).toBe(1000);
  });
});
