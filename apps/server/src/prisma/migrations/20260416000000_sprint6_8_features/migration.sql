
-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgvector";

-- CreateEnum
CREATE TYPE "DateCheckinStatus" AS ENUM ('ACTIVE', 'SAFE', 'SOS_TRIGGERED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "LikeType" ADD VALUE 'SKIP';

-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'PENDING_DELETION';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "blockedPhoneHashes" TEXT[],
ADD COLUMN     "deletionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "emergencyContact" TEXT,
ADD COLUMN     "inviteCode" TEXT,
ADD COLUMN     "inviteCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "invitedBy" TEXT,
ADD COLUMN     "notifActivity" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifMarketing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notifMatchSuccess" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifNewMessage" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "privacyBlockContacts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "privacyBlurLocation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "privacyBlurPhotos" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "privacyDisableVisitors" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "privacyIncognito" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pushToken" TEXT;

-- DropTable
DROP TABLE "analytics_events";

-- CreateTable
CREATE TABLE "ActivityVote" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "votedId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DateCheckin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "partnerName" TEXT NOT NULL,
    "partnerUserId" TEXT,
    "location" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "expectedEndAt" TIMESTAMP(3) NOT NULL,
    "status" "DateCheckinStatus" NOT NULL DEFAULT 'ACTIVE',
    "safeConfirmedAt" TIMESTAMP(3),
    "sosTriggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DateCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "streak" INTEGER NOT NULL DEFAULT 1,
    "reward" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackSignal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityVote_activityId_votedId_idx" ON "ActivityVote"("activityId", "votedId");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityVote_activityId_voterId_votedId_key" ON "ActivityVote"("activityId", "voterId", "votedId");

-- CreateIndex
CREATE INDEX "DateCheckin_userId_status_idx" ON "DateCheckin"("userId", "status");

-- CreateIndex
CREATE INDEX "CheckIn_userId_createdAt_idx" ON "CheckIn"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_userId_date_key" ON "CheckIn"("userId", "date");

-- CreateIndex
CREATE INDEX "Achievement_userId_idx" ON "Achievement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_userId_type_key" ON "Achievement"("userId", "type");

-- CreateIndex
CREATE INDEX "FeedbackSignal_userId_createdAt_idx" ON "FeedbackSignal"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_inviteCode_key" ON "User"("inviteCode");

-- AddForeignKey
ALTER TABLE "DateCheckin" ADD CONSTRAINT "DateCheckin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

