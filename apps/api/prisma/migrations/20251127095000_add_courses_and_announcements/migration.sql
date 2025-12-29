-- Create Course-related enums if they do not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CourseStatus') THEN
    CREATE TYPE "CourseStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CourseEnrollmentType') THEN
    CREATE TYPE "CourseEnrollmentType" AS ENUM ('INVITE_ONLY', 'BY_CODE', 'PUBLIC');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CourseRole') THEN
    CREATE TYPE "CourseRole" AS ENUM ('TEACHER', 'TA', 'STUDENT');
  END IF;
END
$$;

-- Create Course table
CREATE TABLE IF NOT EXISTS "Course" (
    "id" SERIAL NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- Course indexes & unique constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Course_code_term_key'
  ) THEN
    ALTER TABLE "Course" ADD CONSTRAINT "Course_code_term_key" UNIQUE ("code", "term");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'Course_code_idx'
  ) THEN
    CREATE INDEX "Course_code_idx" ON "Course"("code");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'Course_term_idx'
  ) THEN
    CREATE INDEX "Course_term_idx" ON "Course"("term");
  END IF;
END
$$;

-- Course foreign keys (add if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Course_createdById_fkey'
  ) THEN
    ALTER TABLE "Course" ADD CONSTRAINT "Course_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Course_teacherId_fkey'
  ) THEN
    ALTER TABLE "Course" ADD CONSTRAINT "Course_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- Create CourseMember join table
CREATE TABLE IF NOT EXISTS "CourseMember" (
    "courseId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "roleInCourse" "CourseRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "CourseMember_pkey" PRIMARY KEY ("courseId", "userId")
);

-- CourseMember indexes & foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'CourseMember_userId_idx'
  ) THEN
    CREATE INDEX "CourseMember_userId_idx" ON "CourseMember"("userId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'CourseMember_courseId_roleInCourse_idx'
  ) THEN
    CREATE INDEX "CourseMember_courseId_roleInCourse_idx" ON "CourseMember"("courseId", "roleInCourse");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CourseMember_courseId_fkey'
  ) THEN
    ALTER TABLE "CourseMember" ADD CONSTRAINT "CourseMember_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CourseMember_userId_fkey'
  ) THEN
    ALTER TABLE "CourseMember" ADD CONSTRAINT "CourseMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

-- Create AnnouncementScope enum if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AnnouncementScope') THEN
    CREATE TYPE "AnnouncementScope" AS ENUM ('COURSE', 'GLOBAL');
  END IF;
END
$$;

-- Create Announcement table
CREATE TABLE IF NOT EXISTS "Announcement" (
    "id" SERIAL NOT NULL,
    "scope" "AnnouncementScope" NOT NULL DEFAULT 'COURSE',
    "courseId" INTEGER,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "authorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- Indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'Announcement_courseId_isPinned_createdAt_idx'
  ) THEN
    CREATE INDEX "Announcement_courseId_isPinned_createdAt_idx" ON "Announcement"("courseId", "isPinned", "createdAt");
  END IF;
END
$$;

-- Foreign keys (add if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Announcement_courseId_fkey'
  ) THEN
    ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Announcement_authorId_fkey'
  ) THEN
    ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;
