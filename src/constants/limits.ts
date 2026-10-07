/** Notes appear (and are saved) when a stress/anxiety stored value is at or above this (D4, D39). */
export const NOTE_THRESHOLD = 4;
export const NOTE_MAX_LENGTH = 50;
export const NOTES_PER_SECTION = 3;

export const BIO_LIMIT = 1000;
/** Diary prompts older than this are purged (D3). */
export const PROMPT_RETENTION_DAYS = 90;
/** Diary range is at most this many days, inclusive. */
export const DIARY_MAX_RANGE_DAYS = 30;

/** Number of rolling one-shot reminders kept scheduled (D28). */
export const REMINDER_WINDOW_SIZE = 14;
export const REMINDER_DEFAULT = { hour: 18, minute: 0 } as const;

/**
 * Startup gives up waiting on SecureStore after this long and proceeds with `hasApiKey = false`,
 * so a keychain call that never settles cannot keep the splash up forever.
 */
export const BOOTSTRAP_TIMEOUT_MS = 4000;
