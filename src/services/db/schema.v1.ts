/**
 * Schema v1 (SPEC §2.7). Fresh app, no migration from the old moodbuddy.db (D1).
 * - Timestamps are UTC ISO 8601 strings; `tz_offset_min` is minutes east of UTC at write time (D20).
 *   A row's local date is `date(timestamp, tz_offset_min || ' minutes')`.
 * - Stress/anxiety: 1 = least … 5 = most; mood: 1 = worst … 5 = best (D39).
 * - Timestamps must be exactly `Date#toISOString()` form (`YYYY-MM-DDTHH:MM:SS.sssZ`): the UTC
 *   search window compares ISO strings lexically, so any other form would sort wrongly.
 * - `diary_prompts.entry_id` cascades on delete (D18). Needs `PRAGMA foreign_keys = ON` per connection.
 */

const OFFSET_CHECK = 'CHECK (tz_offset_min BETWEEN -720 AND 840)';
/** GLOB (case-sensitive, digit classes) rather than LIKE, which is case-insensitive and allows any character for `_`. */
const TIMESTAMP_CHECK =
  "CHECK (timestamp GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]T[0-9][0-9]:[0-9][0-9]:[0-9][0-9].[0-9][0-9][0-9]Z')";
const SCORE_CHECK = (column: string) => `CHECK (${column} BETWEEN 1 AND 5)`;

export const SCHEMA_V1 = `
CREATE TABLE mood_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL ${TIMESTAMP_CHECK},
  tz_offset_min INTEGER NOT NULL ${OFFSET_CHECK},
  mood INTEGER NOT NULL ${SCORE_CHECK('mood')},
  stress INTEGER NOT NULL ${SCORE_CHECK('stress')},
  stress_note_1 TEXT,
  stress_note_2 TEXT,
  stress_note_3 TEXT,
  anxiety INTEGER NOT NULL ${SCORE_CHECK('anxiety')},
  anxiety_note_1 TEXT,
  anxiety_note_2 TEXT,
  anxiety_note_3 TEXT
);
CREATE INDEX idx_mood_entries_timestamp ON mood_entries (timestamp);

CREATE TABLE diary_prompts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id INTEGER NOT NULL REFERENCES mood_entries (id) ON DELETE CASCADE,
  timestamp TEXT NOT NULL ${TIMESTAMP_CHECK},
  tz_offset_min INTEGER NOT NULL ${OFFSET_CHECK},
  prompt TEXT NOT NULL
);
CREATE INDEX idx_diary_prompts_timestamp ON diary_prompts (timestamp);
CREATE INDEX idx_diary_prompts_entry_id ON diary_prompts (entry_id);

CREATE TABLE profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  bio TEXT NOT NULL DEFAULT '',
  photo_uri TEXT
);
INSERT OR IGNORE INTO profile (id, bio, photo_uri) VALUES (1, '', NULL);
`;
