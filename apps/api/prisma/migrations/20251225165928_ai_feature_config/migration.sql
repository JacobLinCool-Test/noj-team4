-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('OPENAI', 'GEMINI');

-- CreateEnum
CREATE TYPE "AiFeature" AS ENUM ('ASSISTANT');

-- CreateEnum
CREATE TYPE "ReasoningEffort" AS ENUM ('NONE', 'MINIMAL', 'LOW', 'MEDIUM', 'HIGH', 'XHIGH');

-- CreateEnum
CREATE TYPE "AiMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateTable AiGlobalConfig
CREATE TABLE "AiGlobalConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "forceDisabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiGlobalConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable AiFeatureConfig
CREATE TABLE "AiFeatureConfig" (
    "feature" "AiFeature" NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "reasoningEffort" "ReasoningEffort" NOT NULL DEFAULT 'NONE',
    "maxOutputTokens" INTEGER NOT NULL DEFAULT 512,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiFeatureConfig_pkey" PRIMARY KEY ("feature")
);

-- CreateTable AiConversation
CREATE TABLE "AiConversation" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "problemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable AiMessage
CREATE TABLE "AiMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "AiMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "safetyFlags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable AiUsageLog
CREATE TABLE "AiUsageLog" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "latencyMs" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER,
    "problemId" TEXT,
    "conversationId" TEXT,

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable AiRateLimitBan
CREATE TABLE "AiRateLimitBan" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "userId" INTEGER,
    "bannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiRateLimitBan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiConversation_userId_problemId_idx" ON "AiConversation"("userId", "problemId");
CREATE INDEX "AiConversation_userId_idx" ON "AiConversation"("userId");
CREATE INDEX "AiConversation_problemId_idx" ON "AiConversation"("problemId");
CREATE INDEX "AiMessage_conversationId_createdAt_idx" ON "AiMessage"("conversationId", "createdAt");
CREATE INDEX "AiUsageLog_userId_createdAt_idx" ON "AiUsageLog"("userId", "createdAt");
CREATE INDEX "AiUsageLog_problemId_createdAt_idx" ON "AiUsageLog"("problemId", "createdAt");
CREATE INDEX "AiUsageLog_conversationId_createdAt_idx" ON "AiUsageLog"("conversationId", "createdAt");
CREATE UNIQUE INDEX "AiRateLimitBan_identifier_key" ON "AiRateLimitBan"("identifier");
CREATE INDEX "AiRateLimitBan_expiresAt_idx" ON "AiRateLimitBan"("expiresAt");
CREATE INDEX "AiRateLimitBan_identifier_idx" ON "AiRateLimitBan"("identifier");

-- AddForeignKey
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
