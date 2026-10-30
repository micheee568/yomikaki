/**
 * Spaced-repetition scheduler.
 *
 * A pure function: (card state, rating, now) -> next card state + log entry.
 * No database, clock, or randomness, so every transition is unit-testable.
 * SM-2-style intervals with short learning steps; swappable for FSRS later.
 */

export type CardState = "NEW" | "LEARNING" | "REVIEW" | "RELEARNING";
export type Rating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export interface CardSchedule {
  state: CardState;
  dueAt: Date;
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
  learningStep: number;
}

export interface ScheduleResult {
  card: CardSchedule;
  log: {
    rating: Rating;
    prevState: CardState;
    newState: CardState;
    intervalDays: number;
  };
}

export const LEARNING_STEPS_MINUTES = [1, 10] as const;
export const RELEARNING_STEP_MINUTES = 10;
export const GRADUATING_INTERVAL_DAYS = 1;
export const EASY_INTERVAL_DAYS = 4;
export const DEFAULT_EASE = 2.5;
export const MIN_EASE = 1.3;
export const MAX_INTERVAL_DAYS = 365;
export const LAPSE_INTERVAL_FACTOR = 0.5;

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export function newCard(now: Date): CardSchedule {
  return {
    state: "NEW",
    dueAt: now,
    intervalDays: 0,
    ease: DEFAULT_EASE,
    reps: 0,
    lapses: 0,
    learningStep: 0,
  };
}

const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * MINUTE_MS);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);
const clampEase = (e: number) => Math.max(MIN_EASE, Math.round(e * 100) / 100);
const clampInterval = (n: number) => Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(n)));

function result(prev: CardSchedule, card: CardSchedule, rating: Rating): ScheduleResult {
  return {
    card,
    log: {
      rating,
      prevState: prev.state,
      newState: card.state,
      intervalDays: card.intervalDays,
    },
  };
}

function scheduleLearning(card: CardSchedule, rating: Rating, now: Date): CardSchedule {
  const steps = LEARNING_STEPS_MINUTES;
  const step = Math.min(card.learningStep, steps.length - 1);

  switch (rating) {
    case "AGAIN":
      return { ...card, state: "LEARNING", learningStep: 0, dueAt: addMinutes(now, steps[0]) };
    case "HARD":
      return { ...card, state: "LEARNING", learningStep: step, dueAt: addMinutes(now, steps[step]) };
    case "GOOD": {
      const next = step + 1;
      if (next >= steps.length) {
        return {
          ...card,
          state: "REVIEW",
          learningStep: 0,
          intervalDays: GRADUATING_INTERVAL_DAYS,
          reps: card.reps + 1,
          dueAt: addDays(now, GRADUATING_INTERVAL_DAYS),
        };
      }
      return { ...card, state: "LEARNING", learningStep: next, dueAt: addMinutes(now, steps[next]) };
    }
    case "EASY":
      return {
        ...card,
        state: "REVIEW",
        learningStep: 0,
        intervalDays: EASY_INTERVAL_DAYS,
        reps: card.reps + 1,
        dueAt: addDays(now, EASY_INTERVAL_DAYS),
      };
  }
}

function scheduleRelearning(card: CardSchedule, rating: Rating, now: Date): CardSchedule {
  if (rating === "AGAIN" || rating === "HARD") {
    return { ...card, state: "RELEARNING", dueAt: addMinutes(now, RELEARNING_STEP_MINUTES) };
  }
  // GOOD / EASY: graduate back to review using the interval reduced at lapse time.
  const interval = rating === "EASY" ? clampInterval(card.intervalDays + 1) : clampInterval(card.intervalDays);
  return {
    ...card,
    state: "REVIEW",
    intervalDays: interval,
    reps: card.reps + 1,
    dueAt: addDays(now, interval),
  };
}

function scheduleReview(card: CardSchedule, rating: Rating, now: Date): CardSchedule {
  const prev = Math.max(1, card.intervalDays);

  switch (rating) {
    case "AGAIN":
      return {
        ...card,
        state: "RELEARNING",
        lapses: card.lapses + 1,
        ease: clampEase(card.ease - 0.2),
        intervalDays: clampInterval(prev * LAPSE_INTERVAL_FACTOR),
        dueAt: addMinutes(now, RELEARNING_STEP_MINUTES),
      };
    case "HARD": {
      const interval = clampInterval(Math.max(prev + 1, prev * 1.2));
      return {
        ...card,
        ease: clampEase(card.ease - 0.15),
        intervalDays: interval,
        reps: card.reps + 1,
        dueAt: addDays(now, interval),
      };
    }
    case "GOOD": {
      const interval = clampInterval(Math.max(prev + 1, prev * card.ease));
      return { ...card, intervalDays: interval, reps: card.reps + 1, dueAt: addDays(now, interval) };
    }
    case "EASY": {
      const interval = clampInterval(Math.max(prev + 1, prev * card.ease * 1.3));
      return {
        ...card,
        ease: clampEase(card.ease + 0.15),
        intervalDays: interval,
        reps: card.reps + 1,
        dueAt: addDays(now, interval),
      };
    }
  }
}

export function schedule(card: CardSchedule, rating: Rating, now: Date): ScheduleResult {
  let next: CardSchedule;
  switch (card.state) {
    case "NEW":
    case "LEARNING":
      next = scheduleLearning(card, rating, now);
      break;
    case "RELEARNING":
      next = scheduleRelearning(card, rating, now);
      break;
    case "REVIEW":
      next = scheduleReview(card, rating, now);
      break;
  }
  return result(card, next, rating);
}

/** Milliseconds until the card is next due, for each possible answer (for button labels). */
export function previewDelays(card: CardSchedule, now: Date): Record<Rating, number> {
  const ratings: Rating[] = ["AGAIN", "HARD", "GOOD", "EASY"];
  const out = {} as Record<Rating, number>;
  for (const r of ratings) out[r] = schedule(card, r, now).card.dueAt.getTime() - now.getTime();
  return out;
}

/** "10m", "1d", "3mo"... compact label for a delay in ms. */
export function formatDelay(ms: number): string {
  const minutes = Math.round(ms / MINUTE_MS);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(ms / DAY_MS);
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
}
