-- Remove unused Problem.slug field now that URL uses displayId
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Problem' AND column_name = 'slug'
  ) THEN
    ALTER TABLE "Problem" DROP COLUMN "slug";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Problem_slug_key'
  ) THEN
    ALTER TABLE "Problem" DROP CONSTRAINT "Problem_slug_key";
  END IF;
END $$;
