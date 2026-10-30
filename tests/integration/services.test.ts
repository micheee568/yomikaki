import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { lookupWord } from "@/lib/dictionary/lookup";
import { createReading, deleteReading, getReading, listReadings, saveUnknownWords, updateProgress } from "@/lib/services/readings";
import { answerCard, getDueCards } from "@/lib/services/reviews";
import { getStats } from "@/lib/services/stats";
import { deleteVocabulary, listVocabulary, saveWord } from "@/lib/services/vocab";

const word = (over: Record<string, string | undefined> = {}) => ({
  term: "食べる",
  reading: "たべる",
  meaning: "to eat",
  sentence: "寿司を食べました。",
  surfaceForm: "食べました",
  ...over,
});

let userId: string;
let otherUserId: string;

beforeEach(async () => {
  await db.user.deleteMany();
  await db.dictionaryEntry.deleteMany();
  userId = (await db.user.create({ data: { email: "a@test" } })).id;
  otherUserId = (await db.user.create({ data: { email: "b@test" } })).id;
});

describe("saveWord", () => {
  it("creates one card with a NEW review state due immediately", async () => {
    const now = new Date("2026-03-01T10:00:00Z");
    const { vocabulary, created } = await saveWord(userId, word(), now);
    expect(created).toBe(true);

    const state = await db.reviewState.findUnique({ where: { vocabularyId: vocabulary.id } });
    expect(state).toMatchObject({ state: "NEW", intervalDays: 0, ease: 2.5 });
    expect(state?.dueAt).toEqual(now);
  });

  it("does not create a duplicate card when the same word is saved again", async () => {
    await saveWord(userId, word());
    const second = await saveWord(userId, word());
    expect(second.created).toBe(false);
    expect(second.contextAdded).toBe(false);
    expect(await db.vocabulary.count({ where: { userId } })).toBe(1);
    expect(await db.reviewState.count()).toBe(1);
  });

  it("attaches a new sentence to the existing card", async () => {
    await saveWord(userId, word());
    const second = await saveWord(userId, word({ sentence: "毎日ご飯を食べる。", surfaceForm: "食べる" }));
    expect(second.created).toBe(false);
    expect(second.contextAdded).toBe(true);

    const [card] = await listVocabulary(userId);
    expect(card.contexts).toHaveLength(2);
  });

  it("survives concurrent double-saves without duplicating", async () => {
    await Promise.all([saveWord(userId, word()), saveWord(userId, word()), saveWord(userId, word())]);
    expect(await db.vocabulary.count({ where: { userId } })).toBe(1);
    expect(await db.reviewState.count()).toBe(1);
  });

  it("lets different users study the same word independently", async () => {
    await saveWord(userId, word());
    await saveWord(otherUserId, word());
    expect(await db.vocabulary.count()).toBe(2);
  });

  it("keeps different readings of the same spelling as separate cards", async () => {
    await saveWord(userId, word({ term: "日", reading: "ひ", meaning: "day; sun" }));
    await saveWord(userId, word({ term: "日", reading: "にち", meaning: "day (counter)" }));
    expect(await db.vocabulary.count({ where: { userId } })).toBe(2);
  });

  it("rejects a readingId owned by someone else", async () => {
    const theirs = await createReading(otherUserId, { title: "t", content: "猫が好きです" });
    await expect(saveWord(userId, word({ readingId: theirs.id }))).rejects.toMatchObject({ status: 400 });
  });

  it("search filters by term, reading or meaning", async () => {
    await saveWord(userId, word());
    await saveWord(userId, word({ term: "飲む", reading: "のむ", meaning: "to drink" }));
    expect(await listVocabulary(userId, "drink")).toHaveLength(1);
    expect(await listVocabulary(userId, "たべ")).toHaveLength(1);
    expect(await listVocabulary(userId)).toHaveLength(2);
  });

  it("deleting a word removes its contexts, state and logs; other users' words are untouched", async () => {
    const { vocabulary } = await saveWord(userId, word());
    const theirs = await saveWord(otherUserId, word());
    await answerCard(userId, { vocabularyId: vocabulary.id, rating: "GOOD" });

    await expect(deleteVocabulary(otherUserId, vocabulary.id)).rejects.toMatchObject({ status: 404 });
    await deleteVocabulary(userId, vocabulary.id);

    expect(await db.vocabularyContext.count({ where: { vocabularyId: vocabulary.id } })).toBe(0);
    expect(await db.reviewState.count({ where: { vocabularyId: vocabulary.id } })).toBe(0);
    expect(await db.reviewLog.count({ where: { vocabularyId: vocabulary.id } })).toBe(0);
    expect(await db.vocabulary.findUnique({ where: { id: theirs.vocabulary.id } })).not.toBeNull();
  });
});

describe("reviews", () => {
  const t0 = new Date("2026-03-01T10:00:00Z");

  it("returns only cards that are due, oldest first, with interval previews and context", async () => {
    const a = await saveWord(userId, word(), t0);
    await saveWord(userId, word({ term: "飲む", reading: "のむ", meaning: "to drink" }), new Date("2026-03-01T11:00:00Z"));
    await answerCard(userId, { vocabularyId: a.vocabulary.id, rating: "EASY" }, t0); // pushed 4 days out

    const due = await getDueCards(userId, new Date("2026-03-01T12:00:00Z"));
    expect(due.dueTotal).toBe(1);
    expect(due.cards.map((c) => c.term)).toEqual(["飲む"]);
    expect(due.cards[0].nextIntervals).toEqual({ AGAIN: "1m", HARD: "1m", GOOD: "10m", EASY: "4d" });
    expect(due.cards[0].context?.sentence).toBe("寿司を食べました。");
  });

  it("updates the schedule and appends to the log without overwriting history", async () => {
    const { vocabulary } = await saveWord(userId, word(), t0);

    await answerCard(userId, { vocabularyId: vocabulary.id, rating: "GOOD", durationMs: 2500 }, t0);
    const afterSecond = await answerCard(userId, { vocabularyId: vocabulary.id, rating: "GOOD" }, new Date("2026-03-01T10:10:00Z"));

    expect(afterSecond).toMatchObject({ state: "REVIEW", intervalDays: 1 });
    const logs = await db.reviewLog.findMany({ where: { vocabularyId: vocabulary.id }, orderBy: { reviewedAt: "asc" } });
    expect(logs.map((l) => [l.prevState, l.newState])).toEqual([
      ["NEW", "LEARNING"],
      ["LEARNING", "REVIEW"],
    ]);
    expect(logs[0].durationMs).toBe(2500);
  });

  it("refuses to answer another user's card and leaves it unchanged", async () => {
    const { vocabulary } = await saveWord(otherUserId, word(), t0);
    await expect(answerCard(userId, { vocabularyId: vocabulary.id, rating: "GOOD" }, t0)).rejects.toMatchObject({ status: 404 });
    expect(await db.reviewLog.count()).toBe(0);
    expect((await db.reviewState.findUnique({ where: { vocabularyId: vocabulary.id } }))?.state).toBe("NEW");
  });
});

describe("readings", () => {
  it("tokenizes on create and stores the original text untouched", async () => {
    const content = "昨日、寿司を食べました。\n美味しかった。";
    const reading = await createReading(userId, { title: "日記", content });
    expect(reading.status).toBe("READY");

    const full = await getReading(userId, reading.id);
    expect(full.content).toBe(content);
    expect(full.tokens.map((t) => t.surface).join("")).toBe(content);
  });

  it("marks words that are already saved so the reader can highlight them", async () => {
    const reading = await createReading(userId, { title: "t", content: "寿司を食べました。" });
    await saveWord(userId, word({ readingId: reading.id }));
    expect((await getReading(userId, reading.id)).savedTerms).toEqual(["食べる"]);
    expect((await getReading(userId, reading.id)).tokens.length).toBeGreaterThan(0);
  });

  it("tracks progress separately and reports percent read", async () => {
    const reading = await createReading(userId, { title: "t", content: "猫が好きです。犬も好きです。" });
    const total = (await getReading(userId, reading.id)).tokens.length;
    await updateProgress(userId, reading.id, Math.floor(total / 2));

    const [item] = await listReadings(userId);
    expect(item.percentRead).toBeGreaterThanOrEqual(45);
    expect(item.percentRead).toBeLessThanOrEqual(55);
  });

  it("hides other users' readings and refuses to modify them", async () => {
    const theirs = await createReading(otherUserId, { title: "secret", content: "猫" });
    await expect(getReading(userId, theirs.id)).rejects.toMatchObject({ status: 404 });
    await expect(updateProgress(userId, theirs.id, 3)).rejects.toMatchObject({ status: 404 });
    await expect(deleteReading(userId, theirs.id)).rejects.toMatchObject({ status: 404 });
    expect(await listReadings(userId)).toHaveLength(0);
  });

  it("keeps saved words when their reading is deleted", async () => {
    const reading = await createReading(userId, { title: "t", content: "寿司を食べました。" });
    await saveWord(userId, word({ readingId: reading.id }));
    await deleteReading(userId, reading.id);

    const [card] = await listVocabulary(userId);
    expect(card.contexts).toHaveLength(1);
    expect(card.contexts[0].readingId).toBeNull();
  });
});

describe("stats", () => {
  it("reports due cards, new words, accuracy and streak", async () => {
    const now = new Date("2026-03-10T12:00:00Z");
    const a = await saveWord(userId, word(), new Date("2026-03-09T08:00:00Z"));
    await saveWord(userId, word({ term: "飲む", reading: "のむ", meaning: "to drink" }), new Date("2026-02-01T08:00:00Z"));

    await answerCard(userId, { vocabularyId: a.vocabulary.id, rating: "AGAIN" }, new Date("2026-03-09T09:00:00Z"));
    await answerCard(userId, { vocabularyId: a.vocabulary.id, rating: "GOOD" }, new Date("2026-03-10T09:00:00Z"));

    const stats = await getStats(userId, now);
    expect(stats).toMatchObject({ totalCards: 2, newWords7d: 1, reviewsLast30d: 2, accuracy30d: 0.5, streak: 2 });
    expect(stats.dueToday).toBeGreaterThanOrEqual(1);
  });

  it("is empty-safe for a brand new user", async () => {
    const stats = await getStats(userId);
    expect(stats).toMatchObject({ dueToday: 0, totalCards: 0, accuracy30d: null, streak: 0, recentReadings: [] });
  });
});

describe("lookupWord", () => {
  it("finds entries by dictionary form and returns kanji/kana/senses", async () => {
    await db.dictionaryEntry.create({
      data: {
        id: "jm1",
        jmdictId: 1,
        isCommon: true,
        senses: [{ pos: ["Ichidan verb"], glosses: ["to eat"] }],
        forms: { create: [{ text: "食べる", kind: "KANJI" }, { text: "たべる", kind: "KANA" }] },
      },
    });

    const [hit] = await lookupWord({ baseForm: "食べる", surface: "食べました", pos: "動詞" });
    expect(hit).toMatchObject({ kanji: ["食べる"], kana: ["たべる"], isCommon: true });
    expect(hit.senses[0].glosses).toEqual(["to eat"]);
    expect(await lookupWord({ baseForm: "存在しない" })).toEqual([]);
  });
});

describe("saveUnknownWords", () => {
  it("saves only unsaved words that have a dictionary entry, and is idempotent", async () => {
    const entry = (id: number, kanji: string, kana: string, gloss: string, pos: string) =>
      db.dictionaryEntry.create({
        data: {
          id: `jm${id}`,
          jmdictId: id,
          isCommon: true,
          senses: [{ pos: [pos], glosses: [gloss] }],
          forms: { create: [{ text: kanji, kind: "KANJI" }, { text: kana, kind: "KANA" }] },
        },
      });
    await entry(1, "猫", "ねこ", "cat", "noun");
    await entry(2, "好き", "すき", "liked", "adjectival noun");
    const reading = await createReading(userId, { title: "t", content: "猫が好きです。猫" });
    await saveWord(userId, { term: "猫", reading: "ねこ", meaning: "cat", sentence: "猫", surfaceForm: "猫" });

    const first = await saveUnknownWords(userId, reading.id);
    expect(first.savedTerms).toEqual(["好き"]);
    expect(await db.vocabulary.count({ where: { userId } })).toBe(2);

    const second = await saveUnknownWords(userId, reading.id);
    expect(second.saved).toBe(0);
  });
});
