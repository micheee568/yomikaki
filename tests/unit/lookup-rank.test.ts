import { describe, expect, it, vi } from "vitest";

// rankEntries is pure; stub the DB module so importing lookup doesn't open a connection.
vi.mock("@/lib/db", () => ({ db: {} }));

import { rankEntries } from "@/lib/dictionary/lookup";

const entry = (over: Partial<Parameters<typeof rankEntries>[0][number]>) => ({
  id: "x",
  jmdictId: 1,
  kanji: [],
  kana: [],
  isCommon: false,
  senses: [],
  matchedTexts: [],
  ...over,
});

describe("rankEntries", () => {
  it("puts an exact dictionary-form match ahead of a surface-only match", () => {
    const ranked = rankEntries(
      [
        entry({ id: "surface-only", jmdictId: 1, isCommon: true, matchedTexts: ["食べました"] }),
        entry({ id: "base", jmdictId: 2, matchedTexts: ["食べる"] }),
      ],
      { baseForm: "食べる", surface: "食べました" },
    );
    expect(ranked[0].id).toBe("base");
  });

  it("prefers common entries", () => {
    const ranked = rankEntries(
      [
        entry({ id: "rare", jmdictId: 1, matchedTexts: ["日"] }),
        entry({ id: "common", jmdictId: 2, isCommon: true, matchedTexts: ["日"] }),
      ],
      { baseForm: "日" },
    );
    expect(ranked.map((r) => r.id)).toEqual(["common", "rare"]);
  });

  it("uses the token reading to pick between homographs", () => {
    const ranked = rankEntries(
      [
        entry({ id: "nichi", jmdictId: 1, isCommon: true, kana: ["にち"], matchedTexts: ["日"] }),
        entry({ id: "hi", jmdictId: 2, isCommon: true, kana: ["ひ"], matchedTexts: ["日"] }),
      ],
      { baseForm: "日", reading: "ひ" },
    );
    expect(ranked[0].id).toBe("hi");
  });

  it("prefers entries whose part of speech matches the token (particle で over noun 出)", () => {
    const ranked = rankEntries(
      [
        entry({
          id: "noun",
          jmdictId: 1,
          isCommon: true,
          matchedTexts: ["で"],
          senses: [{ pos: ["noun (common) (futsuumeishi)"], glosses: ["coming out"] }],
        }),
        entry({
          id: "particle",
          jmdictId: 2,
          isCommon: true,
          matchedTexts: ["で"],
          senses: [{ pos: ["particle"], glosses: ["at; in"] }],
        }),
      ],
      { baseForm: "で", pos: "助詞" },
    );
    expect(ranked[0].id).toBe("particle");
  });

  it("breaks ties by JMdict id and returns at most 3 results without internal fields", () => {
    const many = [5, 3, 4, 1, 2].map((n) => entry({ id: `e${n}`, jmdictId: n, matchedTexts: ["あ"] }));
    const ranked = rankEntries(many, { baseForm: "あ" });
    expect(ranked.map((r) => r.id)).toEqual(["e1", "e2", "e3"]);
    expect(ranked[0]).not.toHaveProperty("matchedTexts");
    expect(ranked[0]).not.toHaveProperty("jmdictId");
  });

  it("returns an empty list for no candidates", () => {
    expect(rankEntries([], { baseForm: "x" })).toEqual([]);
  });
});
