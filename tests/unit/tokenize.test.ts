import { describe, expect, it } from "vitest";
import { sentenceAround, tokenize } from "@/lib/text/tokenize";
import { katakanaToHiragana, normalizeTokens, type RawToken } from "@/lib/text/normalize";

const words = async (text: string) => (await tokenize(text)).filter((t) => t.isWord);
const find = async (text: string, surface: string) => (await tokenize(text)).find((t) => t.surface === surface);

describe("tokenize: fixtures", () => {
  it("merges a polite past verb into one unit with its dictionary form", async () => {
    const t = await find("昨日、友達と新しいレストランで寿司を食べました。", "食べました");
    expect(t).toMatchObject({ baseForm: "食べる", reading: "たべました", pos: "動詞", isWord: true });
  });

  it("keeps ている and て-form helpers attached to the verb", async () => {
    expect(await find("本を読んでいる。", "読んでいる")).toMatchObject({ baseForm: "読む", pos: "動詞" });
    expect(await find("彼は走っていってしまった。", "走っていってしまった")).toMatchObject({ baseForm: "走る" });
  });

  it("merges negative and desiderative endings", async () => {
    expect(await find("コーヒーを飲みたくない", "飲みたくない")).toMatchObject({ baseForm: "飲む" });
  });

  it("returns the dictionary form of i-adjectives in the past tense", async () => {
    const t = await find("この映画はとても面白かったです!", "面白かったです");
    expect(t).toMatchObject({ baseForm: "面白い", pos: "形容詞" });
  });

  it("leaves particles as their own tokens", async () => {
    const ws = await words("友達と寿司を食べました");
    const particles = ws.filter((t) => t.pos === "助詞").map((t) => t.surface);
    expect(particles).toEqual(["と", "を"]);
  });

  it("converts katakana readings to hiragana", async () => {
    expect(await find("コーヒーを飲みたくない", "コーヒー")).toMatchObject({ reading: "こーひー" });
  });

  it("treats punctuation as non-clickable", async () => {
    const tokens = await tokenize("昨日、友達と食べました。");
    const punctuation = tokens.filter((t) => ["、", "。"].includes(t.surface));
    expect(punctuation).toHaveLength(2);
    expect(punctuation.every((t) => !t.isWord)).toBe(true);
  });

  it("treats ASCII punctuation as non-clickable but keeps digits clickable", async () => {
    const tokens = await tokenize("2回行った!");
    expect(tokens.find((t) => t.surface === "!")?.isWord).toBe(false);
    expect(tokens.find((t) => t.surface === "2")?.isWord).toBe(true);
  });

  it("emits newlines as explicit non-word tokens", async () => {
    const tokens = await tokenize("東京に行った\n来週また行きます");
    const newlines = tokens.filter((t) => t.surface === "\n");
    expect(newlines).toHaveLength(1);
    expect(newlines[0].isWord).toBe(false);
  });

  it("handles empty and whitespace-only input", async () => {
    expect(await tokenize("")).toEqual([]);
    expect((await tokenize("   ")).every((t) => !t.isWord)).toBe(true);
  });

  it("does not throw on hiragana-only text with poor segmentation (known IPADIC limitation)", async () => {
    const tokens = await tokenize("ひらがなだけのぶんしょうでもだいじょうぶ");
    expect(tokens.length).toBeGreaterThan(0);
  });
});

describe("tokenize: invariants", () => {
  const samples = [
    "昨日、友達と新しいレストランで寿司を食べました。",
    "本を読んでいる。\n\n彼は走っていってしまった。",
    "見せられませんでした",
    "Hello 世界! 123 ABC",
    "「すごい！」と彼は言った。",
    "ひらがなだけのぶんしょうでもだいじょうぶ",
    "　全角スペース　と\t\tタブ",
  ];

  it.each(samples)("joined surfaces reproduce the original text: %s", async (text) => {
    const tokens = await tokenize(text);
    expect(tokens.map((t) => t.surface).join("")).toBe(text);
  });

  it.each(samples)("every token has a non-empty baseForm: %s", async (text) => {
    for (const t of await tokenize(text)) expect(t.baseForm.length).toBeGreaterThan(0);
  });
});

describe("sentenceAround", () => {
  it("returns the sentence containing a token, including its final punctuation", async () => {
    const text = "今日は雨です。明日は晴れるでしょう。";
    const tokens = await tokenize(text);
    const idx = tokens.findIndex((t) => t.surface === "明日");
    expect(sentenceAround(tokens, idx)).toBe("明日は晴れるでしょう。");
  });

  it("stops at newlines", async () => {
    const tokens = await tokenize("猫が好きです\n犬も好きです");
    const idx = tokens.findIndex((t) => t.surface === "犬");
    expect(idx).toBeGreaterThan(-1);
    expect(sentenceAround(tokens, idx)).toBe("犬も好きです");
  });

  it("works for the first and last tokens", async () => {
    const tokens = await tokenize("猫が好きです");
    expect(sentenceAround(tokens, 0)).toBe("猫が好きです");
    expect(sentenceAround(tokens, tokens.length - 1)).toBe("猫が好きです");
  });
});

describe("normalizeTokens (no dictionary needed)", () => {
  const raw = (over: Partial<RawToken>): RawToken => ({
    surface_form: "",
    pos: "名詞",
    pos_detail_1: "一般",
    basic_form: "*",
    reading: "*",
    ...over,
  });

  it("falls back to the surface form when kuromoji has no base form", () => {
    const [t] = normalizeTokens([raw({ surface_form: "ググる" })]);
    expect(t.baseForm).toBe("ググる");
    expect(t.reading).toBe("");
    expect(t.isWord).toBe(true);
  });

  it("does not merge an auxiliary into a noun head", () => {
    const tokens = normalizeTokens([
      raw({ surface_form: "学生", reading: "ガクセイ", basic_form: "学生" }),
      raw({ surface_form: "です", pos: "助動詞", pos_detail_1: "*", basic_form: "です", reading: "デス" }),
    ]);
    expect(tokens.map((t) => t.surface)).toEqual(["学生", "です"]);
  });
});

describe("katakanaToHiragana", () => {
  it("converts katakana and leaves other characters alone", () => {
    expect(katakanaToHiragana("タベマシタ")).toBe("たべました");
    expect(katakanaToHiragana("コーヒー")).toBe("こーひー");
    expect(katakanaToHiragana("abc漢字")).toBe("abc漢字");
  });
});
