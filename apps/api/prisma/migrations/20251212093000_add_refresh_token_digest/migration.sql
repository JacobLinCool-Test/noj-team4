-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN "tokenDigest" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenDigest_key" ON "RefreshToken"("tokenDigest");

