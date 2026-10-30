import type { Token } from "./normalize";

const SENTENCE_END = /[。！？!?\n]/;

/**
 * The sentence containing the token at `index`, so a saved word keeps its
 * context. Sentence-ending punctuation stays attached to the sentence.
 * Client-safe: no dictionary or Node imports.
 */
export function sentenceAround(tokens: Token[], index: number): string {
  let start = index;
  while (start > 0 && !SENTENCE_END.test(tokens[start - 1].surface)) start -= 1;

  let end = index;
  while (end < tokens.length - 1 && !SENTENCE_END.test(tokens[end].surface)) end += 1;

  const sentence = tokens
    .slice(start, end + 1)
    .map((t) => t.surface)
    .join("");
  return sentence.replace(/\n/g, "").trim();
}
