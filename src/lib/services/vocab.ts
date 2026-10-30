import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError, notFound } from "@/lib/errors";
import { newCard } from "@/lib/srs/scheduler";
import type { SaveWordInput } from "@/lib/validation";

/**
 * Saves a word with the sentence it came from. A word is one card per
 * (user, term, reading): saving it again from another sentence adds a new
 * context to the existing card instead of creating a duplicate.
 */
export async function saveWord(userId: string, input: SaveWordInput, now = new Date()) {
  if (input.readingId) {
    const owned = await db.reading.findFirst({ where: { id: input.readingId, userId }, select: { id: true } });
    if (!owned) throw new HttpError(400, "readingId does not belong to you");
  }

  // Two quick clicks can race past the existence check; the unique constraint
  // catches the loser, so retry once and take the "already exists" path.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        let vocab = await tx.vocabulary.findUnique({
          where: { userId_term_reading: { userId, term: input.term, reading: input.reading } },
        });
        const created = !vocab;

        if (!vocab) {
          const card = newCard(now);
          vocab = await tx.vocabulary.create({
            data: {
              userId,
              term: input.term,
              reading: input.reading,
              meaning: input.meaning,
              partOfSpeech: input.partOfSpeech,
              dictionaryEntryId: input.dictionaryEntryId,
              createdAt: now,
              reviewState: {
                create: {
                  state: card.state,
                  dueAt: card.dueAt,
                  intervalDays: card.intervalDays,
                  ease: card.ease,
                  reps: card.reps,
                  lapses: card.lapses,
                  learningStep: card.learningStep,
                },
              },
            },
          });
        }

        const readingId = input.readingId ?? null;
        const sameContext = await tx.vocabularyContext.findFirst({
          where: { vocabularyId: vocab.id, readingId, sentence: input.sentence },
        });
        const contextAdded = !sameContext;
        if (!sameContext) {
          await tx.vocabularyContext.create({
            data: { vocabularyId: vocab.id, readingId, sentence: input.sentence, surfaceForm: input.surfaceForm },
          });
        }

        return { vocabulary: vocab, created, contextAdded };
      });
    } catch (err) {
      const raceLost = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!raceLost || attempt === 1) throw err;
    }
  }
  throw new Error("unreachable");
}

export async function listVocabulary(userId: string, search?: string) {
  const q = search?.trim();
  return db.vocabulary.findMany({
    where: {
      userId,
      ...(q ? { OR: [{ term: { contains: q } }, { reading: { contains: q } }, { meaning: { contains: q } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      contexts: { orderBy: { createdAt: "desc" }, select: { id: true, sentence: true, surfaceForm: true, readingId: true } },
      reviewState: { select: { state: true, dueAt: true, intervalDays: true } },
    },
  });
}

export async function deleteVocabulary(userId: string, id: string) {
  const { count } = await db.vocabulary.deleteMany({ where: { id, userId } });
  if (count === 0) throw notFound("Word not found");
  return { deleted: true };
}
