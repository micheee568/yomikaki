/**
 * Pure helpers for dashboard numbers. They take plain data (no Prisma) so
 * they can be tested without a database.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar-day key (YYYY-MM-DD) for an instant, in the learner's timezone offset (minutes east of UTC). */
export function dayKey(date: Date, tzOffsetMinutes = 0): string {
  return new Date(date.getTime() + tzOffsetMinutes * 60_000).toISOString().slice(0, 10);
}

/**
 * Consecutive days with at least one review, ending today. If nothing has been
 * reviewed yet today the streak is still alive as long as yesterday had a review.
 */
export function currentStreak(reviewTimes: Date[], now: Date, tzOffsetMinutes = 0): number {
  const days = new Set(reviewTimes.map((d) => dayKey(d, tzOffsetMinutes)));
  let cursor = now;
  if (!days.has(dayKey(cursor, tzOffsetMinutes))) cursor = new Date(cursor.getTime() - DAY_MS);

  let streak = 0;
  while (days.has(dayKey(cursor, tzOffsetMinutes))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}

/** Share of answers that weren't "Again", as 0..1. Returns null with no reviews. */
export function accuracy(ratings: string[]): number | null {
  if (ratings.length === 0) return null;
  return ratings.filter((r) => r !== "AGAIN").length / ratings.length;
}

/** End of the learner's current day as an instant, used to count cards due "today". */
export function endOfDay(now: Date, tzOffsetMinutes = 0): Date {
  const local = new Date(now.getTime() + tzOffsetMinutes * 60_000);
  local.setUTCHours(23, 59, 59, 999);
  return new Date(local.getTime() - tzOffsetMinutes * 60_000);
}
