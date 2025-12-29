-- Normalize UserRole enum to {ADMIN, USER}

-- 1) Add USER to existing enum if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'USER' AND enumtypid = '"UserRole"'::regtype) THEN
    ALTER TYPE "UserRole" ADD VALUE 'USER';
  END IF;
END $$;

-- 2) Remap legacy roles to USER
UPDATE "User" SET "role" = 'USER' WHERE "role" IN ('TEACHER', 'TA', 'STUDENT');

-- 3) Replace enum with trimmed version
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'userrole_old') THEN
    CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'USER');
    ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
    ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
    ALTER TYPE "UserRole" RENAME TO "UserRole_old";
    ALTER TYPE "UserRole_new" RENAME TO "UserRole";
    DROP TYPE "UserRole_old";
    ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
  END IF;
END$$;
