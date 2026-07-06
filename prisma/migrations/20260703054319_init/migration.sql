-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "tags" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Essay" (
    "id" TEXT NOT NULL,
    "promptId" TEXT,
    "content" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "durationSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Essay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "essayId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "raw" TEXT NOT NULL,
    "taskResponse" DOUBLE PRECISION NOT NULL,
    "coherenceCohesion" DOUBLE PRECISION NOT NULL,
    "lexicalResource" DOUBLE PRECISION NOT NULL,
    "grammaticalRange" DOUBLE PRECISION NOT NULL,
    "overallBand" DOUBLE PRECISION NOT NULL,
    "toeicWritingEst" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhraseCard" (
    "id" TEXT NOT NULL,
    "original" TEXT NOT NULL,
    "upgraded" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "essayId" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "ease" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhraseCard_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Essay" ADD CONSTRAINT "Essay_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_essayId_fkey" FOREIGN KEY ("essayId") REFERENCES "Essay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhraseCard" ADD CONSTRAINT "PhraseCard_essayId_fkey" FOREIGN KEY ("essayId") REFERENCES "Essay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

