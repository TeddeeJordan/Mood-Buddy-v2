import { BIO_LIMIT } from '@/constants/limits';

/** Cuts the bio to BIO_LIMIT by slicing, so a paste over the limit is cut (SPEC §3.3). */
export function clampBio(text: string): string {
  return text.length > BIO_LIMIT ? text.slice(0, BIO_LIMIT) : text;
}

/** Visible counter, e.g. `12 / 1000`. */
export function bioCounterLabel(length: number): string {
  return `${length} / ${BIO_LIMIT}`;
}

/** Screen-reader counter, e.g. `12 of 1000 characters used`. */
export function bioCounterAccessibilityLabel(length: number): string {
  return `${length} of ${BIO_LIMIT} characters used`;
}

export function isBioAtLimit(length: number): boolean {
  return length >= BIO_LIMIT;
}
