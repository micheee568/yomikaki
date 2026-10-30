import { describe, expect, it } from "vitest";
import {
  formatDelay,
  newCard,
  previewDelays,
  schedule,
  type CardSchedule,
} from "@/lib/srs/scheduler";

const NOW = new Date("2026-01-10T09:00:00.000Z");
const minutes = (n: number) => n * 60_000;
const days = (n: number) => n * 24 * 60 * 60_000;

const reviewCard = (over: Partial<CardSchedule> = {}): CardSchedule => ({
  state: "REVIEW",
  dueAt: NOW,
  intervalDays: 10,
  ease: 2.5,
  reps: 5,
  lapses: 0,
  learningStep: 0,
  ...over,
});

describe("new / learning cards", () => {
  it("Again on a new card enters learning at step 0, due in 1 minute", () => {
    const { card } = schedule(newCard(NOW), "AGAIN", NOW);
    expect(card.state).toBe("LEARNING");
    expect(card.learningStep).toBe(0);
    expect(card.dueAt.getTime() - NOW.getTime()).toBe(minutes(1));
  });

  it("Good advances through steps then graduates to a 1 day review", () => {
    const first = schedule(newCard(NOW), "GOOD", NOW).card;
    expect(first.state).toBe("LEARNING");
    expect(first.learningStep).toBe(1);
    expect(first.dueAt.getTime() - NOW.getTime()).toBe(minutes(10));

    const graduated = schedule(first, "GOOD", NOW).card;
    expect(graduated.state).toBe("REVIEW");
    expect(graduated.intervalDays).toBe(1);
    expect(graduated.dueAt.getTime() - NOW.getTime()).toBe(days(1));
    expect(graduated.reps).toBe(1);
  });

  it("Easy graduates immediately to a 4 day interval", () => {
    const { card } = schedule(newCard(NOW), "EASY", NOW);
    expect(card.state).toBe("REVIEW");
    expect(card.intervalDays).toBe(4);
  });

  it("Hard repeats the current step", () => {
    const step1 = schedule(newCard(NOW), "GOOD", NOW).card;
    const { card } = schedule(step1, "HARD", NOW);
    expect(card.state).toBe("LEARNING");
    expect(card.learningStep).toBe(1);
    expect(card.dueAt.getTime() - NOW.getTime()).toBe(minutes(10));
  });

  it("Again mid-learning resets to step 0", () => {
    const step1 = schedule(newCard(NOW), "GOOD", NOW).card;
    expect(schedule(step1, "AGAIN", NOW).card.learningStep).toBe(0);
  });
});

describe("review cards", () => {
  it("Again lapses: relearning in 10 minutes, ease -0.2, interval halved", () => {
    const { card } = schedule(reviewCard(), "AGAIN", NOW);
    expect(card.state).toBe("RELEARNING");
    expect(card.lapses).toBe(1);
    expect(card.ease).toBe(2.3);
    expect(card.intervalDays).toBe(5);
    expect(card.dueAt.getTime() - NOW.getTime()).toBe(minutes(10));
  });

  it("Hard grows the interval by 1.2x and lowers ease", () => {
    const { card } = schedule(reviewCard(), "HARD", NOW);
    expect(card.intervalDays).toBe(12);
    expect(card.ease).toBe(2.35);
    expect(card.state).toBe("REVIEW");
  });

  it("Good multiplies the interval by ease", () => {
    const { card } = schedule(reviewCard(), "GOOD", NOW);
    expect(card.intervalDays).toBe(25);
    expect(card.ease).toBe(2.5);
    expect(card.dueAt.getTime() - NOW.getTime()).toBe(days(25));
  });

  it("Easy grows faster and raises ease", () => {
    const { card } = schedule(reviewCard(), "EASY", NOW);
    expect(card.intervalDays).toBe(33); // 10 * 2.5 * 1.3 = 32.5 -> 33
    expect(card.ease).toBe(2.65);
  });

  it("Good and Easy always grow by at least a day, even with minimum ease", () => {
    const tiny = reviewCard({ intervalDays: 1, ease: 1.3 });
    expect(schedule(tiny, "GOOD", NOW).card.intervalDays).toBe(2);
    expect(schedule(tiny, "HARD", NOW).card.intervalDays).toBe(2);
  });

  it("ease never drops below 1.3", () => {
    let card = reviewCard({ ease: 1.35 });
    for (let i = 0; i < 5; i++) card = schedule(card, "HARD", NOW).card;
    expect(card.ease).toBe(1.3);
  });

  it("interval is capped at 365 days", () => {
    const { card } = schedule(reviewCard({ intervalDays: 300 }), "EASY", NOW);
    expect(card.intervalDays).toBe(365);
  });
});

describe("relearning cards", () => {
  const relearning = (): CardSchedule => schedule(reviewCard(), "AGAIN", NOW).card;

  it("Again keeps the card in relearning", () => {
    const { card } = schedule(relearning(), "AGAIN", NOW);
    expect(card.state).toBe("RELEARNING");
    expect(card.dueAt.getTime() - NOW.getTime()).toBe(minutes(10));
  });

  it("Good returns to review using the reduced interval", () => {
    const { card } = schedule(relearning(), "GOOD", NOW);
    expect(card.state).toBe("REVIEW");
    expect(card.intervalDays).toBe(5);
    expect(card.lapses).toBe(1);
  });
});

describe("purity and logging", () => {
  it("is deterministic and does not mutate its input", () => {
    const input = reviewCard();
    const snapshot = JSON.stringify(input);
    const a = schedule(input, "GOOD", NOW);
    const b = schedule(input, "GOOD", NOW);
    expect(a).toEqual(b);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("returns a log entry describing the transition", () => {
    const { log } = schedule(newCard(NOW), "EASY", NOW);
    expect(log).toEqual({ rating: "EASY", prevState: "NEW", newState: "REVIEW", intervalDays: 4 });
  });

  it("previewDelays matches what schedule would do", () => {
    const delays = previewDelays(newCard(NOW), NOW);
    expect(delays.AGAIN).toBe(minutes(1));
    expect(delays.EASY).toBe(days(4));
  });
});

describe("formatDelay", () => {
  it("formats minutes, hours, days, months", () => {
    expect(formatDelay(minutes(1))).toBe("1m");
    expect(formatDelay(minutes(10))).toBe("10m");
    expect(formatDelay(minutes(120))).toBe("2h");
    expect(formatDelay(days(1))).toBe("1d");
    expect(formatDelay(days(90))).toBe("3mo");
  });
});
