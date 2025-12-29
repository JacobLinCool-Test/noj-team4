-- Refactor UserRole enum from ADMIN/TEACHER/TA/STUDENT to ADMIN/USER
-- This migration simplifies global user roles, keeping TEACHER/TA/STUDENT only at course level

-- Step 1: Create new enum type
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'USER');

-- Step 2: Convert all non-ADMIN roles to USER and update column to use new enum
ALTER TABLE "User"
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" TYPE "UserRole_new"
    USING (CASE
      WHEN "role"::text = 'ADMIN' THEN 'ADMIN'::"UserRole_new"
      ELSE 'USER'::"UserRole_new"
    END),
  ALTER COLUMN "role" SET DEFAULT 'USER'::"UserRole_new";

-- Step 3: Drop old enum and rename new one
DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
