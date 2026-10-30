import { db } from "@/lib/db";

export interface Sense {
  pos: string[];
  glosses: string[];
}

export interface DictionaryResult {
  id: string;
  kanji: string[];
  kana: string[];
  isCommon: boolean;
  senses: Sense[];
}

export interface LookupQuery {
  /** Dictionary form from the tokenizer (食べる). */
  baseForm: string;
  /** Text as it appears in the reading (食べました). */
  surface?: string;
  /** Hiragana reading of the surface; only comparable for uninflected words. */
  reading?: string;
  /** Kuromoji part of speech (助詞, 名詞, ...), used to prefer entries of the same kind. */
  pos?: string;
}

// Kuromoji POS -> a word that appears in the matching JMdict POS descriptions.
const POS_KEYWORDS: Record<string, string> = {
  名詞: "noun",
  動詞: "verb",
  形容詞: "adjective",
  副詞: "adverb",
  助詞: "particle",
  助動詞: "auxiliary",
  連体詞: "pre-noun",
  接続詞: "conjunction",
  感動詞: "interjection",
};

interface Candidate extends DictionaryResult {
  jmdictId: number;
  matchedTexts: string[];
}

const MAX_RESULTS = 3;

/**
 * Orders candidate entries so the most likely meaning comes first.
 * Exact dictionary-form match beats a surface-only match; common words beat
 * rare ones; a kana form equal to the token's reading is a good sign for
 * homographs (e.g. 日 read ひ vs にち).
 */
export function rankEntries(candidates: Candidate[], query: LookupQuery): DictionaryResult[] {
  const keyword = query.pos ? POS_KEYWORDS[query.pos] : undefined;
  const posMatches = (c: Candidate) =>
    !!keyword && c.senses.some((s) => s.pos.some((p) => p.toLowerCase().includes(keyword)));

  const score = (c: Candidate) =>
    (c.matchedTexts.includes(query.baseForm) ? 100 : 0) +
    (posMatches(c) ? 60 : 0) +
    (c.isCommon ? 50 : 0) +
    (query.reading && c.kana.includes(query.reading) ? 30 : 0);

  return [...candidates]
    .sort((a, b) => score(b) - score(a) || a.jmdictId - b.jmdictId)
    .slice(0, MAX_RESULTS)
    .map((c) => ({ id: c.id, kanji: c.kanji, kana: c.kana, isCommon: c.isCommon, senses: c.senses }));
}

export async function lookupWord(query: LookupQuery): Promise<DictionaryResult[]> {
  const texts = [...new Set([query.baseForm, query.surface].filter((t): t is string => !!t))];
  if (texts.length === 0) return [];

  const matches = await db.dictionaryForm.findMany({
    where: { text: { in: texts } },
    select: {
      text: true,
      entry: { select: { id: true, jmdictId: true, isCommon: true, senses: true, forms: { select: { text: true, kind: true } } } },
    },
  });

  const byEntry = new Map<string, Candidate>();
  for (const m of matches) {
    const existing = byEntry.get(m.entry.id);
    if (existing) {
      existing.matchedTexts.push(m.text);
      continue;
    }
    byEntry.set(m.entry.id, {
      id: m.entry.id,
      jmdictId: m.entry.jmdictId,
      isCommon: m.entry.isCommon,
      senses: m.entry.senses as unknown as Sense[],
      kanji: m.entry.forms.filter((f) => f.kind === "KANJI").map((f) => f.text),
      kana: m.entry.forms.filter((f) => f.kind === "KANA").map((f) => f.text),
      matchedTexts: [m.text],
    });
  }

  return rankEntries([...byEntry.values()], query);
}
