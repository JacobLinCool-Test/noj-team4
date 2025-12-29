-- Add soft-delete support for courses
-- 1) CourseStatus: add DELETED
-- 2) AuditAction: add COURSE_DELETE

ALTER TYPE "CourseStatus" ADD VALUE IF NOT EXISTS 'DELETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'COURSE_DELETE';
