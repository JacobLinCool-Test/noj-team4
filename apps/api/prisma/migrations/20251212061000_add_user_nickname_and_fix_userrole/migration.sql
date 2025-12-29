-- Add nickname column to User if missing
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nickname" TEXT;

-- Ensure UserRole enum contains expected values (idempotent on PG16+)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ADMIN';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'TEACHER';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'TA';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'STUDENT';
