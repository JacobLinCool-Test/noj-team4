-- AlterTable
ALTER TABLE "CourseProblem" ADD COLUMN "quota" INTEGER NOT NULL DEFAULT -1;
ALTER TABLE "CourseProblem" ADD COLUMN "allowAiAssistant" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Homework" DROP COLUMN "weightPercent";

-- AlterTable
ALTER TABLE "HomeworkProblem" DROP COLUMN "points";
ALTER TABLE "HomeworkProblem" DROP COLUMN "quota";
