-- Manual migration to align DB with updated Prisma schema (Course module + simplified roles)

-- 1) Ensure course-related enums exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coursestatus') THEN
    CREATE TYPE "CourseStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'courseenrollmenttype') THEN
    CREATE TYPE "CourseEnrollmentType" AS ENUM ('INVITE_ONLY', 'BY_CODE', 'PUBLIC');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'courserole') THEN
    CREATE TYPE "CourseRole" AS ENUM ('TEACHER', 'TA', 'STUDENT');
  END IF;
END $$;

-- 2) Extend AuditAction enum with course-related events (ignore if already exists)
DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE 'COURSE_CREATE';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE 'COURSE_UPDATE';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE 'COURSE_ARCHIVE';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE 'COURSE_MEMBER_ADD';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE 'COURSE_MEMBER_ROLE_CHANGE';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE 'COURSE_MEMBER_REMOVE';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE 'COURSE_JOIN_PUBLIC';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE 'COURSE_JOIN_BY_CODE';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "AuditAction" ADD VALUE 'COURSE_LEAVE';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Add 'USER' to current UserRole enum (if missing) so we can safely remap legacy values
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'USER' AND enumtypid = 'UserRole'::regtype) THEN
    ALTER TYPE "UserRole" ADD VALUE 'USER';
  END IF;
END $$;

-- 4) Normalize existing User.role values (Teacher/TA/Student -> USER)
UPDATE "User" SET "role" = 'USER' WHERE "role" IN ('TEACHER', 'TA', 'STUDENT');

-- 5) Replace UserRole enum with new values {ADMIN, USER}
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

-- 6) Add columns to AuditLog
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "courseId" INTEGER;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "homeworkId" INTEGER;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "problemId" INTEGER;

-- 7) Add nickname to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nickname" TEXT;
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';

-- 8) Create Course table
CREATE TABLE IF NOT EXISTS "Course" (
    "id" SERIAL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "description" TEXT,
    "status" "CourseStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrollmentType" "CourseEnrollmentType" NOT NULL DEFAULT 'INVITE_ONLY',
    "joinCode" TEXT,
    "teacherId" INTEGER,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- 9) Create CourseMember table
CREATE TABLE IF NOT EXISTS "CourseMember" (
    "courseId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "roleInCourse" "CourseRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    CONSTRAINT "CourseMember_pkey" PRIMARY KEY ("courseId","userId")
);

-- 10) Indexes
CREATE INDEX IF NOT EXISTS "Course_code_idx" ON "Course"("code");
CREATE INDEX IF NOT EXISTS "Course_term_idx" ON "Course"("term");
CREATE UNIQUE INDEX IF NOT EXISTS "Course_code_term_key" ON "Course"("code", "term");
CREATE INDEX IF NOT EXISTS "CourseMember_userId_idx" ON "CourseMember"("userId");
CREATE INDEX IF NOT EXISTS "CourseMember_courseId_roleInCourse_idx" ON "CourseMember"("courseId", "roleInCourse");

-- 11) Foreign keys
ALTER TABLE "Course" DROP CONSTRAINT IF EXISTS "Course_teacherId_fkey";
ALTER TABLE "Course" DROP CONSTRAINT IF EXISTS "Course_createdById_fkey";
ALTER TABLE "CourseMember" DROP CONSTRAINT IF EXISTS "CourseMember_courseId_fkey";
ALTER TABLE "CourseMember" DROP CONSTRAINT IF EXISTS "CourseMember_userId_fkey";

ALTER TABLE "Course" ADD CONSTRAINT "Course_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseMember" ADD CONSTRAINT "CourseMember_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CourseMember" ADD CONSTRAINT "CourseMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
