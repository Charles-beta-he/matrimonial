-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'MATCHMAKER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BANNED', 'DELETED');

-- CreateEnum
CREATE TYPE "TextAuditContext" AS ENUM ('MESSAGE', 'BIO', 'NICKNAME');

-- CreateEnum
CREATE TYPE "PushAudience" AS ENUM ('ALL', 'ACTIVE', 'INACTIVE', 'MALE', 'FEMALE', 'VERIFIED', 'PREMIUM');

-- AlterTable
ALTER TABLE "User"
    ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER',
    ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN "bannedAt" TIMESTAMP(3),
    ADD COLUMN "banReason" TEXT;

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateTable
CREATE TABLE "Matchmaker" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activeClients" INTEGER NOT NULL DEFAULT 0,
    "totalMatches" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Matchmaker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Matchmaker_userId_key" ON "Matchmaker"("userId");

-- AddForeignKey
ALTER TABLE "Matchmaker" ADD CONSTRAINT "Matchmaker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "TextAuditItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "context" "TextAuditContext" NOT NULL,
    "status" "AuditStatus" NOT NULL DEFAULT 'PENDING',
    "handledBy" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TextAuditItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TextAuditItem_status_createdAt_idx" ON "TextAuditItem"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "TextAuditItem" ADD CONSTRAINT "TextAuditItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "PushCampaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" "PushAudience" NOT NULL,
    "scheduleAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "delivered" INTEGER NOT NULL DEFAULT 0,
    "opened" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PushCampaign_createdAt_idx" ON "PushCampaign"("createdAt");
