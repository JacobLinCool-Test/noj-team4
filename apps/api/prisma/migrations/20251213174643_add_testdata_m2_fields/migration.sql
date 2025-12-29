/*
  Warnings:

  - You are about to drop the column `createdAt` on the `ProblemTestdata` table. All the data in the column will be lost.
  - You are about to drop the column `manifestKey` on the `ProblemTestdata` table. All the data in the column will be lost.
  - Added the required column `manifest` to the `ProblemTestdata` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uploadedById` to the `ProblemTestdata` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ProblemTestdata_problemId_createdAt_idx";

-- AlterTable
ALTER TABLE "ProblemTestdata" DROP COLUMN "createdAt",
DROP COLUMN "manifestKey",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manifest" JSONB NOT NULL,
ADD COLUMN     "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "uploadedById" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "ProblemTestdata_problemId_uploadedAt_idx" ON "ProblemTestdata"("problemId", "uploadedAt");

-- CreateIndex
CREATE INDEX "ProblemTestdata_problemId_isActive_idx" ON "ProblemTestdata"("problemId", "isActive");

-- AddForeignKey
ALTER TABLE "ProblemTestdata" ADD CONSTRAINT "ProblemTestdata_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
