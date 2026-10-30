import { db } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { formatDelay, previewDelays, schedule, type CardSchedule } from "@/lib/srs/scheduler";
import type { AnswerInput } from "@/lib/validation";

const toSchedule = (s: {
  state: CardSchedule["state"];
  dueAt: Date;
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
  learningStep: number;
}): CardSchedule => ({
  state: s.state,
  dueAt: s.dueAt,
  intervalDays: s.intervalDays,
  ease: s.ease,
  reps: s.reps,
  lapses: s.lapses,
  learningStep: s.learningStep,
});

/** Cards due now, oldest first, each with its sentence context and the interval each button would give. */
export async function getDueCards(userId: string, now = new Date(), limit = 20) {
  const states = await db.reviewState.findMany({
    where: { dueAt: { lte: now }, vocabulary: { userId } },
    orderBy: { dueAt: "asc" },
    take: limit,
    include: {
      vocabulary: {
        include: { contexts: { orderBy: { createdAt: "desc" }, take: 1 } },
      },
    },
  });

  const dueTotal = await db.reviewState.count({ where: { dueAt: { lte: now }, vocabulary: { userId } } });

  return {
    dueTotal,
    cards: states.map((s) => {
      const delays = previewDelays(toSchedule(s), now);
      return {
        vocabularyId: s.vocabularyId,
        term: s.vocabulary.term,
        reading: s.vocabulary.reading,
        meaning: s.vocabulary.meaning,
        partOfSpeech: s.vocabulary.partOfSpeech,
        state: s.state,
        context: s.vocabulary.contexts[0] ?? null,
        nextIntervals: {
          AGAIN: formatDelay(delays.AGAIN),
          HARD: formatDelay(delays.HARD),
          GOOD: formatDelay(delays.GOOD),
          EASY: formatDelay(delays.EASY),
        },
      };
    }),
  };
}

/** Applies an answer: updates the card's schedule and appends to the immutable log, atomically. */
export async function answerCard(userId: string, input: AnswerInput, now = new Date()) {
  return db.$transaction(async (tx) => {
    const state = await tx.reviewState.findFirst({
      where: { vocabularyId: input.vocabularyId, vocabulary: { userId } },
    });
    if (!state) throw notFound("Card not found");

    const { card, log } = schedule(toSchedule(state), input.rating, now);

    await tx.reviewState.update({ where: { vocabularyId: state.vocabularyId }, data: card });
    await tx.reviewLog.create({
      data: {
        vocabularyId: state.vocabularyId,
        reviewedAt: now,
        rating: log.rating,
        durationMs: input.durationMs,
        prevState: log.prevState,
        newState: log.newState,
        intervalDays: log.intervalDays,
      },
    });

    return { vocabularyId: state.vocabularyId, state: card.state, dueAt: card.dueAt, intervalDays: card.intervalDays };
  });
}
