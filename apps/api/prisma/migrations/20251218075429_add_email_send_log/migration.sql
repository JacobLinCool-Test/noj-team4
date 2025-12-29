-- CreateEnum
CREATE TYPE "EmailSendType" AS ENUM ('GENERIC', 'VERIFY_EMAIL', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "EmailSendStatus" AS ENUM ('SENT', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "EmailSendLog" (
    "id" SERIAL NOT NULL,
    "type" "EmailSendType" NOT NULL,
    "status" "EmailSendStatus" NOT NULL DEFAULT 'SENT',
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT,
    "provider" TEXT,
    "messageId" TEXT,
    "error" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSendLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailSendLog_recipientEmail_createdAt_idx" ON "EmailSendLog"("recipientEmail", "createdAt");

-- CreateIndex
CREATE INDEX "EmailSendLog_type_createdAt_idx" ON "EmailSendLog"("type", "createdAt");

-- CreateIndex
CREATE INDEX "EmailSendLog_status_createdAt_idx" ON "EmailSendLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EmailSendLog_userId_createdAt_idx" ON "EmailSendLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "EmailSendLog" ADD CONSTRAINT "EmailSendLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

