import type { DictionaryResult } from "./lookup";
import type { Token } from "@/lib/text/normalize";

/** A short default meaning: the first gloss of up to three senses. */
export function defaultMeaning(entry: DictionaryResult): string {
  return entry.senses
    .slice(0, 3)
    .map((s) => s.glosses[0])
    .filter(Boolean)
    .join("; ");
}

/** The entry's kana that fits the token: its own reading if listed, else the primary one. */
export function entryReading(entry: DictionaryResult, token: Token): string {
  return entry.kana.includes(token.reading) ? token.reading : (entry.kana[0] ?? token.reading);
}
