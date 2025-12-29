-- CreateTable
CREATE TABLE "CourseProblem" (
    "courseId" INTEGER NOT NULL,
    "problemId" TEXT NOT NULL,
    "addedById" INTEGER,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseProblem_pkey" PRIMARY KEY ("courseId","problemId")
);

-- CreateIndex
CREATE INDEX "CourseProblem_problemId_idx" ON "CourseProblem"("problemId");

-- CreateIndex
CREATE INDEX "CourseProblem_courseId_addedAt_idx" ON "CourseProblem"("courseId", "addedAt");

-- AddForeignKey
ALTER TABLE "CourseProblem" ADD CONSTRAINT "CourseProblem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseProblem" ADD CONSTRAINT "CourseProblem_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseProblem" ADD CONSTRAINT "CourseProblem_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
