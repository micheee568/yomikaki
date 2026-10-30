import { z } from "zod";

export const MAX_READING_CHARS = 50_000;

export const createReadingSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  content: z.string().trim().min(1, "Text is required").max(MAX_READING_CHARS, `Text must be at most ${MAX_READING_CHARS} characters`),
});

export const progressSchema = z.object({
  position: z.number().int().min(0),
});

export const saveWordSchema = z.object({
  term: z.string().trim().min(1).max(100),
  reading: z.string().trim().max(200),
  meaning: z.string().trim().min(1, "Meaning is required").max(500),
  partOfSpeech: z.string().trim().max(100).optional(),
  dictionaryEntryId: z.string().optional(),
  readingId: z.string().optional(),
  sentence: z.string().trim().min(1).max(1000),
  surfaceForm: z.string().trim().min(1).max(100),
});

export const answerSchema = z.object({
  vocabularyId: z.string().min(1),
  rating: z.enum(["AGAIN", "HARD", "GOOD", "EASY"]),
  durationMs: z.number().int().min(0).max(3_600_000).optional(),
});

export const lookupSchema = z.object({
  baseForm: z.string().trim().min(1).max(100),
  surface: z.string().trim().max(100).optional(),
  reading: z.string().trim().max(200).optional(),
  pos: z.string().trim().max(20).optional(),
});

export type SaveWordInput = z.infer<typeof saveWordSchema>;
export type AnswerInput = z.infer<typeof answerSchema>;
