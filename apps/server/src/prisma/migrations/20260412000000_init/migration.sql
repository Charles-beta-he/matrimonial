-- ========================================================================
-- Initial migration for Matrimonial platform
-- Generated to match apps/server/src/prisma/schema.prisma
-- ========================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ========================================================================
-- Enums
-- ========================================================================

CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

CREATE TYPE "Education" AS ENUM ('HIGH_SCHOOL', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'PHD');

CREATE TYPE "IncomeRange" AS ENUM ('BELOW_5K', 'K5_10', 'K10_20', 'K20_50', 'ABOVE_50K');

CREATE TYPE "VerificationLevel" AS ENUM ('L1', 'L2', 'L3', 'L4');

CREATE TYPE "Membership" AS ENUM ('FREE', 'MONTHLY', 'QUARTERLY', 'YEARLY');

CREATE TYPE "LikeType" AS ENUM ('NORMAL', 'SUPER');

CREATE TYPE "MessageType" AS ENUM ('TEXT', 'VOICE', 'IMAGE', 'VIDEO', 'EPHEMERAL_IMAGE', 'SYSTEM');

CREATE TYPE "AuditStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'CANCELLED');

CREATE TYPE "ProductType" AS ENUM ('MEMBERSHIP', 'SUPER_LIKE', 'BOOST', 'LOVE_LETTER', 'VIDEO_TICKET');

CREATE TYPE "ReportReason" AS ENUM ('FAKE_PROFILE', 'HARASSMENT', 'SCAM', 'INAPPROPRIATE_CONTENT', 'OTHER');

CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED');

CREATE TYPE "ActivityStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED');

CREATE TYPE "SignupStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- ========================================================================
-- Tables
-- ========================================================================

-- User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "birthday" TIMESTAMP(3) NOT NULL,
    "city" TEXT NOT NULL,
    "bio" TEXT,
    "height" INTEGER,
    "education" "Education",
    "occupation" TEXT,
    "incomeRange" "IncomeRange",
    "hometown" TEXT,
    "zodiac" TEXT,
    "mbti" TEXT,
    "location" geometry(Point, 4326),
    "verificationLevel" "VerificationLevel" NOT NULL DEFAULT 'L1',
    "realNameVerified" BOOLEAN NOT NULL DEFAULT false,
    "faceVerified" BOOLEAN NOT NULL DEFAULT false,
    "eduVerified" BOOLEAN NOT NULL DEFAULT false,
    "membership" "Membership",
    "membershipExpiry" TIMESTAMP(3),
    "embedding" vector(256),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE INDEX "User_city_gender_verificationLevel_idx" ON "User"("city", "gender", "verificationLevel");
CREATE INDEX "User_lastActiveAt_idx" ON "User"("lastActiveAt");

-- Photo
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isAvatar" BOOLEAN NOT NULL DEFAULT false,
    "auditStatus" "AuditStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Photo_userId_idx" ON "Photo"("userId");

-- UserPrompt
CREATE TABLE "UserPrompt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerText" TEXT,
    "answerAudioUrl" TEXT,
    "answerVideoUrl" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "UserPrompt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserPrompt_userId_idx" ON "UserPrompt"("userId");

-- UserTag
CREATE TABLE "UserTag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,

    CONSTRAINT "UserTag_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserTag_userId_idx" ON "UserTag"("userId");
CREATE INDEX "UserTag_tag_idx" ON "UserTag"("tag");

-- Preference
CREATE TABLE "Preference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ageMin" INTEGER,
    "ageMax" INTEGER,
    "cities" TEXT[],
    "heightMin" INTEGER,
    "heightMax" INTEGER,
    "educationMin" "Education",
    "acceptLongDistance" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Preference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Preference_userId_key" ON "Preference"("userId");

-- Like
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "type" "LikeType" NOT NULL DEFAULT 'NORMAL',
    "promptId" TEXT,
    "comment" TEXT,
    "isMatched" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Like_fromUserId_toUserId_key" ON "Like"("fromUserId", "toUserId");
CREATE INDEX "Like_toUserId_isMatched_idx" ON "Like"("toUserId", "isMatched");

-- Conversation
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");

-- ConversationParticipant
CREATE TABLE "ConversationParticipant" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

-- Message
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT,
    "mediaUrl" TEXT,
    "isEphemeral" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- PaymentOrder
CREATE TABLE "PaymentOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productType" "ProductType" NOT NULL,
    "productId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "channel" TEXT NOT NULL,
    "tradeNo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentOrder_tradeNo_key" ON "PaymentOrder"("tradeNo");
CREATE INDEX "PaymentOrder_userId_status_idx" ON "PaymentOrder"("userId", "status");

-- Report
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT,
    "evidence" TEXT[],
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "handledBy" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Report_reportedId_status_idx" ON "Report"("reportedId", "status");

-- Activity
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverUrl" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "maxMale" INTEGER NOT NULL,
    "maxFemale" INTEGER NOT NULL,
    "fee" DECIMAL(10,2) NOT NULL,
    "status" "ActivityStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- ActivitySignup
CREATE TABLE "ActivitySignup" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SignupStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivitySignup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActivitySignup_activityId_userId_key" ON "ActivitySignup"("activityId", "userId");

-- ========================================================================
-- Foreign Keys
-- ========================================================================

ALTER TABLE "Photo" ADD CONSTRAINT "Photo_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserPrompt" ADD CONSTRAINT "UserPrompt_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UserTag" ADD CONSTRAINT "UserTag_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Preference" ADD CONSTRAINT "Preference_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Like" ADD CONSTRAINT "Like_fromUserId_fkey"
    FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Like" ADD CONSTRAINT "Like_toUserId_fkey"
    FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey"
    FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedId_fkey"
    FOREIGN KEY ("reportedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ActivitySignup" ADD CONSTRAINT "ActivitySignup_activityId_fkey"
    FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
