import { db } from "@/lib/db";
import { defaultMeaning, entryReading } from "@/lib/dictionary/defaults";
import { lookupWord } from "@/lib/dictionary/lookup";
import { notFound } from "@/lib/errors";
import { sentenceAround, tokenize, type Token } from "@/lib/text/tokenize";
import { saveWord } from "./vocab";

export async function createReading(userId: string, input: { title: string; content: string }) {
  const reading = await db.reading.create({
    data: { userId, title: input.title, content: input.content, status: "PROCESSING" },
  });

  // Tokenizing is fast for pasted text, but it's modelled as a status so slower
  // sources (OCR, long documents) can move to a background job without schema changes.
  try {
    const tokens = await tokenize(input.content);
    return await db.reading.update({
      where: { id: reading.id },
      data: { tokens: tokens as unknown as object, status: "READY", progress: { create: { position: 0 } } },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tokenizing failed";
    return db.reading.update({ where: { id: reading.id }, data: { status: "FAILED", error: message } });
  }
}

export async function listReadings(userId: string) {
  const readings = await db.reading.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      tokens: true,
      progress: { select: { position: true, lastReadAt: true } },
    },
  });

  return readings.map(({ tokens, ...r }) => {
    const total = Array.isArray(tokens) ? tokens.length : 0;
    const position = r.progress?.position ?? 0;
    return { ...r, percentRead: total > 0 ? Math.min(100, Math.round((position / total) * 100)) : 0 };
  });
}

export async function getReading(userId: string, id: string) {
  const reading = await db.reading.findFirst({ where: { id, userId }, include: { progress: true } });
  if (!reading) throw notFound("Reading not found");

  // Which words in this text are already saved, so the reader can highlight them.
  const tokens = (Array.isArray(reading.tokens) ? reading.tokens : []) as unknown as Token[];
  const terms = [...new Set(tokens.filter((t) => t.isWord).map((t) => t.baseForm))];
  const saved = terms.length
    ? await db.vocabulary.findMany({ where: { userId, term: { in: terms } }, select: { term: true } })
    : [];

  return { ...reading, tokens, savedTerms: [...new Set(saved.map((v) => v.term))] };
}

export async function updateProgress(userId: string, readingId: string, position: number) {
  const reading = await db.reading.findFirst({ where: { id: readingId, userId }, select: { id: true } });
  if (!reading) throw notFound("Reading not found");

  return db.readingProgress.upsert({
    where: { readingId },
    update: { position, lastReadAt: new Date() },
    create: { readingId, position },
  });
}

export async function deleteReading(userId: string, id: string) {
  const { count } = await db.reading.deleteMany({ where: { id, userId } });
  if (count === 0) throw notFound("Reading not found");
  return { deleted: true };
}

// Grammar glue rather than vocabulary; saving every が / です would bury the real words.
const SKIP_POS = new Set(["助詞", "助動詞"]);

/**
 * Saves every word in a reading that isn't already in the user's vocabulary.
 * Words with no dictionary entry (names, typos) are skipped rather than saved
 * with an empty meaning.
 */
export async function saveUnknownWords(userId: string, readingId: string) {
  const { tokens } = await getReading(userId, readingId);
  const known = new Set((await db.vocabulary.findMany({ where: { userId }, select: { term: true } })).map((v) => v.term));

  // First occurrence of each unseen word supplies its example sentence.
  const firstIndex = new Map<string, number>();
  tokens.forEach((t, i) => {
    if (t.isWord && !SKIP_POS.has(t.pos) && !known.has(t.baseForm) && !firstIndex.has(t.baseForm)) firstIndex.set(t.baseForm, i);
  });

  const savedTerms: string[] = [];
  let notFoundCount = 0;
  for (const [term, i] of firstIndex) {
    const token = tokens[i];
    const [entry] = await lookupWord({ baseForm: term, surface: token.surface, reading: token.reading, pos: token.pos });
    const meaning = entry ? defaultMeaning(entry) : "";
    if (!entry || !meaning) {
      notFoundCount++;
      continue;
    }
    const { created } = await saveWord(userId, {
      term,
      reading: entryReading(entry, token),
      meaning,
      partOfSpeech: entry.senses[0]?.pos[0],
      dictionaryEntryId: entry.id,
      readingId,
      sentence: sentenceAround(tokens, i),
      surfaceForm: token.surface,
    });
    if (created) savedTerms.push(term);
  }

  return { saved: savedTerms.length, notFound: notFoundCount, savedTerms };
}
