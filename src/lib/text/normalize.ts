/**
 * Turns raw kuromoji tokens into reader tokens. Pure, so it's testable
 * without loading the 17 MB dictionary.
 *
 * Kuromoji splits 食べました into 食べ / まし / た. For a reader that's too
 * fine-grained, so a verb or adjective absorbs its trailing inflection
 * (auxiliary verbs, て-form particles, 〜ている style helpers) into one
 * clickable unit whose baseForm is the head's dictionary form (食べる).
 */

export interface RawToken {
  surface_form: string;
  pos: string;
  pos_detail_1: string;
  basic_form: string;
  reading?: string;
}

export interface Token {
  surface: string;
  /** Dictionary form to look up (食べました -> 食べる). Falls back to surface. */
  baseForm: string;
  /** Hiragana reading of the surface form; empty when unknown. */
  reading: string;
  pos: string;
  /** Clickable/saveable. False for punctuation, symbols, whitespace, newlines. */
  isWord: boolean;
}

const INFLECTING_HEADS = new Set(["動詞", "形容詞"]);
const TE_PARTICLES = new Set(["て", "で"]);

export function katakanaToHiragana(input: string): string {
  return Array.from(input)
    .map((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 0x30a1 && code <= 0x30f6 ? String.fromCharCode(code - 0x60) : ch;
    })
    .join("");
}

const hasJapanese = (s: string) => /[぀-ヿ㐀-鿿ｦ-ﾟ]/.test(s);
const hasLetterOrDigit = (s: string) => /[\p{L}\p{N}]/u.test(s);

function isWordToken(raw: RawToken): boolean {
  if (raw.pos === "記号") return false;
  if (!raw.surface_form.trim()) return false;
  return hasJapanese(raw.surface_form) || hasLetterOrDigit(raw.surface_form);
}

function readingOf(raw: RawToken): string {
  // Kuromoji uses "*" or omits reading for unknown tokens.
  if (!raw.reading || raw.reading === "*") return "";
  return katakanaToHiragana(raw.reading);
}

function absorbsInto(head: RawToken, next: RawToken): boolean {
  if (!INFLECTING_HEADS.has(head.pos)) return false;
  if (next.pos === "助動詞") return true;
  if (next.pos === "助詞" && next.pos_detail_1 === "接続助詞" && TE_PARTICLES.has(next.surface_form)) return true;
  // Helper verbs such as the い in ている, or しまう / くる after a て-form.
  if (next.pos === "動詞" && next.pos_detail_1 === "非自立") return true;
  return false;
}

export function normalizeTokens(raws: RawToken[]): Token[] {
  const out: Token[] = [];

  for (let i = 0; i < raws.length; i++) {
    const head = raws[i];

    if (!isWordToken(head)) {
      out.push({ surface: head.surface_form, baseForm: head.surface_form, reading: "", pos: head.pos, isWord: false });
      continue;
    }

    let surface = head.surface_form;
    let reading = readingOf(head);
    let j = i;
    while (j + 1 < raws.length && absorbsInto(head, raws[j + 1])) {
      j += 1;
      surface += raws[j].surface_form;
      reading += readingOf(raws[j]);
    }
    i = j;

    const base = head.basic_form && head.basic_form !== "*" ? head.basic_form : head.surface_form;
    out.push({ surface, baseForm: base, reading, pos: head.pos, isWord: true });
  }

  return out;
}
