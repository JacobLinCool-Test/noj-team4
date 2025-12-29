-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'RUNNING', 'AC', 'WA', 'CE', 'TLE', 'MLE', 'RE', 'OLE', 'JUDGE_ERROR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'SUBMISSION_CREATE';
ALTER TYPE "AuditAction" ADD VALUE 'SUBMISSION_REJUDGE';
ALTER TYPE "AuditAction" ADD VALUE 'SUBMISSION_RUN_TEST';

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "problemId" TEXT NOT NULL,
    "courseId" INTEGER,
    "homeworkId" TEXT,
    "language" "ProgrammingLanguage" NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "score" INTEGER,
    "rawScore" INTEGER,
    "sourceKey" TEXT NOT NULL,
    "compileLog" TEXT,
    "summary" JSONB,
    "testdataVersion" INTEGER NOT NULL DEFAULT 1,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "judgedAt" TIMESTAMP(3),

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionCase" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "caseNo" INTEGER NOT NULL,
    "name" TEXT,
    "status" "SubmissionStatus" NOT NULL,
    "timeMs" INTEGER,
    "memoryKb" INTEGER,
    "stdoutTrunc" TEXT,
    "stderrTrunc" TEXT,
    "points" INTEGER,
    "isSample" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SubmissionCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemTestdata" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "zipKey" TEXT NOT NULL,
    "manifestKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemTestdata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Submission_userId_createdAt_idx" ON "Submission"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Submission_problemId_createdAt_idx" ON "Submission"("problemId", "createdAt");

-- CreateIndex
CREATE INDEX "Submission_courseId_createdAt_idx" ON "Submission"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "Submission_homeworkId_createdAt_idx" ON "Submission"("homeworkId", "createdAt");

-- CreateIndex
CREATE INDEX "SubmissionCase_submissionId_caseNo_idx" ON "SubmissionCase"("submissionId", "caseNo");

-- CreateIndex
CREATE INDEX "ProblemTestdata_problemId_createdAt_idx" ON "ProblemTestdata"("problemId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemTestdata_problemId_version_key" ON "ProblemTestdata"("problemId", "version");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionCase" ADD CONSTRAINT "SubmissionCase_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemTestdata" ADD CONSTRAINT "ProblemTestdata_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
