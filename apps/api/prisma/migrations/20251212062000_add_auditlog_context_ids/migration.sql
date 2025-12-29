-- Add contextual ids to AuditLog if missing
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "courseId" INTEGER;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "homeworkId" INTEGER;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "problemId" TEXT;

-- Indexes for faster filtering (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'AuditLog_courseId_idx'
  ) THEN
    CREATE INDEX "AuditLog_courseId_idx" ON "AuditLog"("courseId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'AuditLog_homeworkId_idx'
  ) THEN
    CREATE INDEX "AuditLog_homeworkId_idx" ON "AuditLog"("homeworkId");
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = current_schema() AND indexname = 'AuditLog_problemId_idx'
  ) THEN
    CREATE INDEX "AuditLog_problemId_idx" ON "AuditLog"("problemId");
  END IF;
END
$$;
