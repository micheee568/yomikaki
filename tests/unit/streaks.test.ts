import { describe, expect, it } from "vitest";
import { accuracy, currentStreak, dayKey, endOfDay } from "@/lib/stats/streaks";

const at = (iso: string) => new Date(iso);

describe("currentStreak", () => {
  const now = at("2026-01-10T12:00:00Z");

  it("is 0 with no reviews", () => {
    expect(currentStreak([], now)).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    const reviews = [at("2026-01-10T08:00:00Z"), at("2026-01-09T20:00:00Z"), at("2026-01-08T01:00:00Z")];
    expect(currentStreak(reviews, now)).toBe(3);
  });

  it("keeps the streak alive if only yesterday was reviewed", () => {
    expect(currentStreak([at("2026-01-09T10:00:00Z"), at("2026-01-08T10:00:00Z")], now)).toBe(2);
  });

  it("breaks after a missed day", () => {
    expect(currentStreak([at("2026-01-10T10:00:00Z"), at("2026-01-08T10:00:00Z")], now)).toBe(1);
  });

  it("counts several reviews on one day once", () => {
    expect(currentStreak([at("2026-01-10T01:00:00Z"), at("2026-01-10T05:00:00Z")], now)).toBe(1);
  });

  it("is 0 when the last review was two or more days ago", () => {
    expect(currentStreak([at("2026-01-07T10:00:00Z")], now)).toBe(0);
  });

  it("respects the learner's timezone", () => {
    // 2026-01-10T16:00Z is already Jan 11 in Tokyo (UTC+9).
    expect(dayKey(at("2026-01-10T16:00:00Z"), 9 * 60)).toBe("2026-01-11");
    const tokyoNow = at("2026-01-10T16:30:00Z");
    expect(currentStreak([at("2026-01-10T15:30:00Z")], tokyoNow, 9 * 60)).toBe(1);
  });
});

describe("accuracy", () => {
  it("is null with no reviews", () => {
    expect(accuracy([])).toBeNull();
  });

  it("treats everything except Again as correct", () => {
    expect(accuracy(["GOOD", "EASY", "HARD", "AGAIN"])).toBe(0.75);
  });
});

describe("endOfDay", () => {
  it("returns the last instant of the learner's day", () => {
    expect(endOfDay(at("2026-01-10T12:00:00Z"), 0).toISOString()).toBe("2026-01-10T23:59:59.999Z");
    // Tokyo: Jan 10 12:00Z is Jan 10 21:00 local; day ends at Jan 10 14:59:59.999Z.
    expect(endOfDay(at("2026-01-10T12:00:00Z"), 9 * 60).toISOString()).toBe("2026-01-10T14:59:59.999Z");
  });
});
