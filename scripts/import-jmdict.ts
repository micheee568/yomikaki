/**
 * Imports JMdict (jmdict-simplified, "eng-common") into the database.
 *
 *   yarn db:import-dict [path/to/jmdict-eng-common-*.json]
 *
 * Skips quietly if the dictionary is already loaded, so it's safe to re-run.
 * Dictionary data: JMdict/EDRDG, CC BY-SA 4.0 (https://www.edrdg.org/edrdg/licence.html).
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

interface JmdictWord {
  id: string;
  kanji: { common: boolean; text: string }[];
  kana: { common: boolean; text: string }[];
  sense: { partOfSpeech: string[]; gloss: { lang: string; text: string }[] }[];
}

interface JmdictFile {
  tags: Record<string, string>;
  words: JmdictWord[];
}

const CHUNK = 500;

function findDictionaryFile(arg?: string): string {
  if (arg) return path.resolve(arg);
  const dir = path.join(process.cwd(), "data", "jmdict");
  const file = fs.existsSync(dir) ? fs.readdirSync(dir).find((f) => /^jmdict-eng.*\.json$/.test(f)) : undefined;
  if (!file) throw new Error(`No JMdict JSON found in ${dir}. Download jmdict-eng-common from jmdict-simplified releases.`);
  return path.join(dir, file);
}

async function main() {
  const db = new PrismaClient();
  try {
    const existing = await db.dictionaryEntry.count();
    if (existing > 0) {
      console.log(`Dictionary already loaded (${existing} entries); nothing to do.`);
      return;
    }

    const file = findDictionaryFile(process.argv[2]);
    console.log(`Reading ${file}`);
    const data = JSON.parse(fs.readFileSync(file, "utf8")) as JmdictFile;

    const entries = data.words.map((w) => ({
      id: `jm${w.id}`,
      jmdictId: Number(w.id),
      isCommon: w.kanji.some((k) => k.common) || w.kana.some((k) => k.common),
      senses: w.sense.map((s) => ({
        pos: s.partOfSpeech.map((p) => data.tags[p] ?? p),
        glosses: s.gloss.filter((g) => g.lang === "eng").map((g) => g.text),
      })),
    }));

    const forms = data.words.flatMap((w) => [
      ...w.kanji.map((k) => ({ entryId: `jm${w.id}`, text: k.text, kind: "KANJI" as const })),
      ...w.kana.map((k) => ({ entryId: `jm${w.id}`, text: k.text, kind: "KANA" as const })),
    ]);

    for (let i = 0; i < entries.length; i += CHUNK) {
      await db.dictionaryEntry.createMany({ data: entries.slice(i, i + CHUNK) });
    }
    for (let i = 0; i < forms.length; i += CHUNK) {
      await db.dictionaryForm.createMany({ data: forms.slice(i, i + CHUNK) });
    }
    console.log(`Imported ${entries.length} entries and ${forms.length} forms.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
