-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "preferredLevel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Reading" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "tokens" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reading_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReadingProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "readingId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "lastReadAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReadingProgress_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "Reading" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DictionaryEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jmdictId" INTEGER NOT NULL,
    "senses" JSONB NOT NULL,
    "isCommon" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "DictionaryForm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    CONSTRAINT "DictionaryForm_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "DictionaryEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vocabulary" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "dictionaryEntryId" TEXT,
    "term" TEXT NOT NULL,
    "reading" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "partOfSpeech" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vocabulary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vocabulary_dictionaryEntryId_fkey" FOREIGN KEY ("dictionaryEntryId") REFERENCES "DictionaryEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VocabularyContext" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vocabularyId" TEXT NOT NULL,
    "readingId" TEXT,
    "sentence" TEXT NOT NULL,
    "surfaceForm" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VocabularyContext_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "Vocabulary" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VocabularyContext_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "Reading" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewState" (
    "vocabularyId" TEXT NOT NULL PRIMARY KEY,
    "state" TEXT NOT NULL DEFAULT 'NEW',
    "dueAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "ease" REAL NOT NULL DEFAULT 2.5,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "learningStep" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReviewState_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "Vocabulary" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vocabularyId" TEXT NOT NULL,
    "reviewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" TEXT NOT NULL,
    "durationMs" INTEGER,
    "prevState" TEXT NOT NULL,
    "newState" TEXT NOT NULL,
    "intervalDays" INTEGER NOT NULL,
    CONSTRAINT "ReviewLog_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "Vocabulary" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Reading_userId_updatedAt_idx" ON "Reading"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingProgress_readingId_key" ON "ReadingProgress"("readingId");

-- CreateIndex
CREATE UNIQUE INDEX "DictionaryEntry_jmdictId_key" ON "DictionaryEntry"("jmdictId");

-- CreateIndex
CREATE INDEX "DictionaryForm_text_idx" ON "DictionaryForm"("text");

-- CreateIndex
CREATE INDEX "DictionaryForm_entryId_idx" ON "DictionaryForm"("entryId");

-- CreateIndex
CREATE INDEX "Vocabulary_userId_createdAt_idx" ON "Vocabulary"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Vocabulary_userId_term_reading_key" ON "Vocabulary"("userId", "term", "reading");

-- CreateIndex
CREATE INDEX "VocabularyContext_vocabularyId_idx" ON "VocabularyContext"("vocabularyId");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyContext_vocabularyId_readingId_sentence_key" ON "VocabularyContext"("vocabularyId", "readingId", "sentence");

-- CreateIndex
CREATE INDEX "ReviewState_dueAt_idx" ON "ReviewState"("dueAt");

-- CreateIndex
CREATE INDEX "ReviewLog_vocabularyId_reviewedAt_idx" ON "ReviewLog"("vocabularyId", "reviewedAt");

-- CreateIndex
CREATE INDEX "ReviewLog_reviewedAt_idx" ON "ReviewLog"("reviewedAt");
