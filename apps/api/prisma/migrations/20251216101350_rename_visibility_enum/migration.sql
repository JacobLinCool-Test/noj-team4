-- Rename ProblemVisibility enum values for better semantic clarity
-- PRIVATE -> UNLISTED (not publicly listed, but can be shared with courses)
-- HIDDEN -> PRIVATE (truly private, owner only)

-- Step 1: Create new enum with updated values
CREATE TYPE "ProblemVisibility_new" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');

-- Step 2: Add temporary column with new enum type
ALTER TABLE "Problem" ADD COLUMN "visibility_new" "ProblemVisibility_new";

-- Step 3: Copy data with value mapping
UPDATE "Problem"
SET "visibility_new" = CASE
  WHEN "visibility" = 'PUBLIC' THEN 'PUBLIC'::"ProblemVisibility_new"
  WHEN "visibility" = 'PRIVATE' THEN 'UNLISTED'::"ProblemVisibility_new"
  WHEN "visibility" = 'HIDDEN' THEN 'PRIVATE'::"ProblemVisibility_new"
END;

-- Step 4: Drop old column and enum
ALTER TABLE "Problem" DROP COLUMN "visibility";
DROP TYPE "ProblemVisibility";

-- Step 5: Rename new column and enum
ALTER TABLE "Problem" RENAME COLUMN "visibility_new" TO "visibility";
ALTER TYPE "ProblemVisibility_new" RENAME TO "ProblemVisibility";

-- Step 6: Set default value
ALTER TABLE "Problem" ALTER COLUMN "visibility" SET DEFAULT 'PUBLIC';

-- Step 7: Add NOT NULL constraint (if needed)
ALTER TABLE "Problem" ALTER COLUMN "visibility" SET NOT NULL;
