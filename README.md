# Yomikaki 読み書き

Turn Japanese reading into lasting vocabulary. Paste a text, click any word to see its reading and meaning, save it with the sentence you found it in, and review it later with spaced repetition.

Yomikaki runs entirely on your computer. Your data lives in one local SQLite file, with no accounts or hosting.

## Features

- **Library:** paste Japanese text and pick up where you left off.
- **Reader:** click any word for its reading, meanings and part of speech.
- **Vocabulary:** save words with their sentences, or save every new word in a reading at once.
- **Reviews:** spaced-repetition flashcards rated Again, Hard, Good or Easy.
- **Dashboard:** cards due, new words, accuracy and your daily streak.

## Setup

Requires Node 20+ and Yarn 1.

```bash
yarn install
cp .env.example .env
yarn db:deploy         # create the database
yarn db:fetch-dict     # download the JMdict dictionary (~16 MB)
yarn db:import-dict    # load it into the database
yarn db:seed           # optional: demo data
yarn dev               # open http://localhost:3000
```

## Commands

| Command | What it does |
| --- | --- |
| `yarn dev` | Start the app |
| `yarn test` | Run unit and integration tests |
| `yarn e2e` | Run the browser test (first run: `npx playwright install chromium`) |
| `yarn lint` / `yarn typecheck` | Check the code |

## Built with

Next.js, React, TypeScript, Prisma, SQLite, Tailwind CSS, kuromoji (Japanese tokenizer), Vitest and Playwright.

## Credits

Dictionary data is from the [JMdict](https://www.edrdg.org/jmdict/j_jmdict.html) project of the Electronic Dictionary Research and Development Group, used under [CC BY-SA 4.0](https://www.edrdg.org/edrdg/licence.html).
