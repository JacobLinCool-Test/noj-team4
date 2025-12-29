-- AlterTable: Add examId to Submission
ALTER TABLE "Submission" ADD COLUMN "examId" VARCHAR(10);

-- CreateTable: Exam
CREATE TABLE "Exam" (
    "id" VARCHAR(10) NOT NULL,
    "courseId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "problemIds" TEXT[],
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "ipAllowList" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scoreboardVisible" BOOLEAN NOT NULL DEFAULT false,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ExamCode
CREATE TABLE "ExamCode" (
    "code" VARCHAR(6) NOT NULL,
    "examId" VARCHAR(10) NOT NULL,
    "studentId" INTEGER NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedIp" TEXT,
    "sessionToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamCode_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE INDEX "Exam_courseId_startsAt_idx" ON "Exam"("courseId", "startsAt");

-- CreateIndex
CREATE INDEX "Exam_createdById_idx" ON "Exam"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "ExamCode_sessionToken_key" ON "ExamCode"("sessionToken");

-- CreateIndex
CREATE INDEX "ExamCode_examId_idx" ON "ExamCode"("examId");

-- CreateIndex
CREATE INDEX "ExamCode_sessionToken_idx" ON "ExamCode"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "ExamCode_examId_studentId_key" ON "ExamCode"("examId", "studentId");

-- CreateIndex
CREATE INDEX "Submission_examId_userId_idx" ON "Submission"("examId", "userId");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamCode" ADD CONSTRAINT "ExamCode_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamCode" ADD CONSTRAINT "ExamCode_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
