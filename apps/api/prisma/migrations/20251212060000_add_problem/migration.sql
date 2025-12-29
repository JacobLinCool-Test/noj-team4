-- Create Problem-related enums if they do not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProgrammingLanguage') THEN
    CREATE TYPE "ProgrammingLanguage" AS ENUM ('C', 'CPP', 'JAVA', 'PYTHON');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProblemVisibility') THEN
    CREATE TYPE "ProblemVisibility" AS ENUM ('PUBLIC', 'COURSE_ONLY', 'PRIVATE', 'HIDDEN');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProblemDifficulty') THEN
    CREATE TYPE "ProblemDifficulty" AS ENUM ('UNKNOWN', 'EASY', 'MEDIUM', 'HARD');
  END IF;
END
$$;

-- Create Problem table
CREATE TABLE IF NOT EXISTS "Problem" (
    "id" TEXT NOT NULL,
    "displayId" TEXT NOT NULL,
    "slug" TEXT,
    "ownerId" INTEGER NOT NULL,
    "visibility" "ProblemVisibility" NOT NULL DEFAULT 'PUBLIC',
    "difficulty" "ProblemDifficulty" NOT NULL DEFAULT 'UNKNOWN',
    "allowedLanguages" "ProgrammingLanguage"[] NOT NULL,
    "quota" INTEGER NOT NULL DEFAULT -1,
    "canViewStdout" BOOLEAN NOT NULL DEFAULT true,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "input" TEXT NOT NULL,
    "output" TEXT NOT NULL,
    "hint" TEXT,
    "sampleInputs" TEXT[] NOT NULL,
    "sampleOutputs" TEXT[] NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- Unique constraints & indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Problem_displayId_key'
  ) THEN
    ALTER TABLE "Problem" ADD CONSTRAINT "Problem_displayId_key" UNIQUE ("displayId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Problem_slug_key'
  ) THEN
    ALTER TABLE "Problem" ADD CONSTRAINT "Problem_slug_key" UNIQUE ("slug");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'Problem_ownerId_idx'
  ) THEN
    CREATE INDEX "Problem_ownerId_idx" ON "Problem"("ownerId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'Problem_visibility_idx'
  ) THEN
    CREATE INDEX "Problem_visibility_idx" ON "Problem"("visibility");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'Problem_difficulty_idx'
  ) THEN
    CREATE INDEX "Problem_difficulty_idx" ON "Problem"("difficulty");
  END IF;
END
$$;

-- Foreign key to User (owner)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Problem_ownerId_fkey'
  ) THEN
    ALTER TABLE "Problem" ADD CONSTRAINT "Problem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;
