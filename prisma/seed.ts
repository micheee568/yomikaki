/**
 * Demo data: three short readings, saved words with sentence context, and a few
 * days of review history so the dashboard has something to show.
 *
 *   yarn db:seed            # only runs on an empty library
 *   yarn db:seed --reset    # DELETES your readings, words and review history first
 */
import { db } from "../src/lib/db";
import { createReading } from "../src/lib/services/readings";
import { answerCard } from "../src/lib/services/reviews";
import { saveWord } from "../src/lib/services/vocab";
import { getCurrentUser } from "../src/lib/user";

const DAY_MS = 24 * 60 * 60 * 1000;

const readings = [
  {
    title: "日記",
    content: "昨日、友達と新しいレストランで寿司を食べました。\nとても美味しかったです。\n来週もまた行きたいです。",
  },
  {
    title: "天気",
    content: "今日は朝から雨が降っています。\n傘を持っていくのを忘れてしまいました。\n電車が遅れているので、会社に遅刻しそうです。",
  },
  {
    title: "図書館",
    content: "私は毎週土曜日に図書館へ行きます。\n静かな場所で本を読むのが好きです。\n日本語の小説は難しいですが、少しずつ分かるようになってきました。",
  },
];

// readingIndex points into `readings` above.
const words = [
  { term: "食べる", reading: "たべる", meaning: "to eat", surface: "食べました", sentence: "昨日、友達と新しいレストランで寿司を食べました。", readingIndex: 0 },
  { term: "新しい", reading: "あたらしい", meaning: "new", surface: "新しい", sentence: "昨日、友達と新しいレストランで寿司を食べました。", readingIndex: 0 },
  { term: "美味しい", reading: "おいしい", meaning: "delicious", surface: "美味しかった", sentence: "とても美味しかったです。", readingIndex: 0 },
  { term: "忘れる", reading: "わすれる", meaning: "to forget", surface: "忘れて", sentence: "傘を持っていくのを忘れてしまいました。", readingIndex: 1 },
  { term: "遅れる", reading: "おくれる", meaning: "to be late; to be delayed", surface: "遅れて", sentence: "電車が遅れているので、会社に遅刻しそうです。", readingIndex: 1 },
  { term: "遅刻", reading: "ちこく", meaning: "being late (for work, school)", surface: "遅刻", sentence: "電車が遅れているので、会社に遅刻しそうです。", readingIndex: 1 },
  { term: "図書館", reading: "としょかん", meaning: "library", surface: "図書館", sentence: "私は毎週土曜日に図書館へ行きます。", readingIndex: 2 },
  { term: "難しい", reading: "むずかしい", meaning: "difficult", surface: "難しい", sentence: "日本語の小説は難しいですが、少しずつ分かるようになってきました。", readingIndex: 2 },
] as const;

// Ratings by days-ago (4 days ago ... today), one entry per word in order.
const history: Record<number, ("AGAIN" | "HARD" | "GOOD" | "EASY")[]> = {
  4: ["GOOD", "GOOD", "EASY", "AGAIN"],
  3: ["GOOD", "GOOD", "GOOD", "GOOD", "HARD"],
  2: ["GOOD", "EASY", "GOOD", "AGAIN", "GOOD", "GOOD"],
  1: ["GOOD", "GOOD", "GOOD", "GOOD", "GOOD", "HARD", "GOOD"],
};

async function main() {
  const user = await getCurrentUser();
  const existing = await db.reading.count({ where: { userId: user.id } });
  const vocabCount = await db.vocabulary.count({ where: { userId: user.id } });

  if (process.argv.includes("--reset")) {
    await db.reading.deleteMany({ where: { userId: user.id } });
    await db.vocabulary.deleteMany({ where: { userId: user.id } });
    console.log("Reset: removed existing readings, vocabulary and review history.");
  } else if (existing > 0 || vocabCount > 0) {
    console.log(`You already have ${existing} readings and ${vocabCount} words. Not seeding. Use --reset to replace them.`);
    return;
  }

  const now = Date.now();
  const created = [];
  for (const r of readings) created.push(await createReading(user.id, r));

  const saved = [];
  for (const [i, w] of words.entries()) {
    const savedAt = new Date(now - 5 * DAY_MS + i * 60_000);
    const { vocabulary } = await saveWord(
      user.id,
      {
        term: w.term,
        reading: w.reading,
        meaning: w.meaning,
        sentence: w.sentence,
        surfaceForm: w.surface,
        readingId: created[w.readingIndex].id,
      },
      savedAt,
    );
    saved.push(vocabulary);
  }

  for (const [daysAgo, ratings] of Object.entries(history)) {
    const dayStart = now - Number(daysAgo) * DAY_MS;
    for (const [i, rating] of ratings.entries()) {
      await answerCard(
        user.id,
        { vocabularyId: saved[i % saved.length].id, rating, durationMs: 2000 + i * 700 },
        new Date(dayStart + i * 90_000),
      );
    }
  }

  console.log(`Seeded ${created.length} readings, ${saved.length} words and ${Object.values(history).flat().length} reviews.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
