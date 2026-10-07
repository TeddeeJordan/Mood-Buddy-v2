# 004. Time model: UTC timestamp plus stored offset

**Status:** Accepted. Spec: D20, D46 (SPEC §2.7, §3.5, §3.6).

## Context

Users travel. If an entry's day were computed from the device's current time zone, past entries would move between days after a trip, breaking streaks, the dashboard and exports.

## Decision

- Each `mood_entries` and `diary_prompts` row stores a UTC `timestamp` (exactly `Date#toISOString()` form, enforced by a `CHECK` in `src/services/db/schema.v1.ts`) and `tz_offset_min` (minutes east of UTC at write time, -720 to 840).
- An entry's local day is `localDateKeyFromUtc(timestamp, tz_offset_min)` (`src/utils/dates.ts`); in SQL, `date(timestamp, tz_offset_min || ' minutes')`. The device's current zone is never used for past entries.
- Range queries narrow by a padded UTC window (`utcSearchWindowForLocalRange`) and then filter exactly by local day.
- "Today" is the device's current local date. Entries dated after today (after westward travel) count as today for buckets, streak and the reminder skip (`clampToToday`); the Diary/export upper bound is `upperBoundKey` (D46). The stored date is never rewritten.
- Reminder rescheduling after a time zone change waits 24 hours (D20, D37). That logic is not built yet.

## Consequences

- Every date feature must go through `src/utils/dates.ts`; hand-rolled `new Date()` day maths is a bug.
- Tests must pass under any `TZ`: `yarn test:tz` runs the suite in Asia/Kolkata and America/Los_Angeles.
- Offsets are fixed at write time, so a later change to a zone's rules does not alter old entries.
