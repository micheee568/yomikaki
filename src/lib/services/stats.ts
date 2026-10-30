import { db } from "@/lib/db";
import { accuracy, currentStreak, endOfDay } from "@/lib/stats/streaks";

const DAY_MS = 24 * 60 * 60 * 1000;

/** tzOffsetMinutes is minutes east of UTC (Tokyo = 540), so "today" matches the learner's day. */
export async function getStats(userId: string, now = new Date(), tzOffsetMinutes = 0) {
  const [dueToday, totalCards, newWords7d, recentLogs, streakLogs, recentReadings] = await Promise.all([
    db.reviewState.count({ where: { dueAt: { lte: endOfDay(now, tzOffsetMinutes) }, vocabulary: { userId } } }),
    db.vocabulary.count({ where: { userId } }),
    db.vocabulary.count({ where: { userId, createdAt: { gte: new Date(now.getTime() - 7 * DAY_MS) } } }),
    db.reviewLog.findMany({
      where: { vocabulary: { userId }, reviewedAt: { gte: new Date(now.getTime() - 30 * DAY_MS) } },
      select: { rating: true },
    }),
    db.reviewLog.findMany({
      where: { vocabulary: { userId }, reviewedAt: { gte: new Date(now.getTime() - 400 * DAY_MS) } },
      select: { reviewedAt: true },
    }),
    db.reading.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, updatedAt: true, progress: { select: { lastReadAt: true } } },
    }),
  ]);

  const reviewedToday = streakLogs.filter(
    (l) => l.reviewedAt >= new Date(endOfDay(now, tzOffsetMinutes).getTime() - DAY_MS + 1),
  ).length;

  return {
    dueToday,
    totalCards,
    newWords7d,
    reviewsLast30d: recentLogs.length,
    accuracy30d: accuracy(recentLogs.map((l) => l.rating)),
    streak: currentStreak(
      streakLogs.map((l) => l.reviewedAt),
      now,
      tzOffsetMinutes,
    ),
    reviewedToday,
    recentReadings: recentReadings.map((r) => ({ id: r.id, title: r.title, lastReadAt: r.progress?.lastReadAt ?? r.updatedAt })),
  };
}
