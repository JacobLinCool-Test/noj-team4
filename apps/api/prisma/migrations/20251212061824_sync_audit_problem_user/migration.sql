/*
  Warnings:

  - The `problemId` column on the `AuditLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'COURSE_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'COURSE_UPDATE';
ALTER TYPE "AuditAction" ADD VALUE 'COURSE_ARCHIVE';
ALTER TYPE "AuditAction" ADD VALUE 'COURSE_MEMBER_ADD';
ALTER TYPE "AuditAction" ADD VALUE 'COURSE_MEMBER_ROLE_CHANGE';
ALTER TYPE "AuditAction" ADD VALUE 'COURSE_MEMBER_REMOVE';
ALTER TYPE "AuditAction" ADD VALUE 'COURSE_JOIN_PUBLIC';
ALTER TYPE "AuditAction" ADD VALUE 'COURSE_JOIN_BY_CODE';
ALTER TYPE "AuditAction" ADD VALUE 'COURSE_LEAVE';

-- DropIndex
DROP INDEX IF EXISTS "AuditLog_courseId_idx";

-- DropIndex
DROP INDEX IF EXISTS "AuditLog_homeworkId_idx";

-- DropIndex
DROP INDEX IF EXISTS "AuditLog_problemId_idx";

-- AlterTable
ALTER TABLE "AuditLog"
DROP COLUMN IF EXISTS "problemId",
ADD COLUMN IF NOT EXISTS "problemId" INTEGER;
