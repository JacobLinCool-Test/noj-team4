-- Re-add legacy Problem.slug for compatibility with existing Prisma client/runtime.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Problem' AND column_name = 'slug'
  ) THEN
    ALTER TABLE "Problem" ADD COLUMN "slug" TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Problem_slug_key'
  ) THEN
    ALTER TABLE "Problem" ADD CONSTRAINT "Problem_slug_key" UNIQUE ("slug");
  END IF;
END $$;
