import path from "node:path";
import kuromoji from "kuromoji";
import { normalizeTokens, type RawToken, type Token } from "./normalize";

export type { Token } from "./normalize";

type Tokenizer = kuromoji.Tokenizer<kuromoji.IpadicFeatures>;

// Building the tokenizer loads ~17 MB of dictionary, so do it once per process.
let tokenizerPromise: Promise<Tokenizer> | null = null;

function getTokenizer(): Promise<Tokenizer> {
  if (!tokenizerPromise) {
    const dicPath = path.join(process.cwd(), "node_modules", "kuromoji", "dict");
    tokenizerPromise = new Promise<Tokenizer>((resolve, reject) => {
      kuromoji.builder({ dicPath }).build((err, tokenizer) => (err ? reject(err) : resolve(tokenizer)));
    }).catch((err) => {
      tokenizerPromise = null; // allow a retry on the next call
      throw err;
    });
  }
  return tokenizerPromise;
}

/**
 * Splits Japanese text into reader tokens. Newlines are kept as explicit
 * non-word tokens so the reader can render paragraphs.
 */
export async function tokenize(text: string): Promise<Token[]> {
  const tokenizer = await getTokenizer();
  const tokens: Token[] = [];

  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  lines.forEach((line, index) => {
    if (line.length > 0) {
      const raws = tokenizer.tokenize(line) as unknown as RawToken[];
      tokens.push(...normalizeTokens(raws));
    }
    if (index < lines.length - 1) {
      tokens.push({ surface: "\n", baseForm: "\n", reading: "", pos: "記号", isWord: false });
    }
  });

  return tokens;
}

export { sentenceAround } from "./sentence";
