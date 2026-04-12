-- CreateTable
CREATE TABLE "ProfileView" (
    "id" TEXT NOT NULL,
    "viewerId" TEXT NOT NULL,
    "viewedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfileView_viewerId_viewedId_key" ON "ProfileView"("viewerId", "viewedId");
CREATE INDEX "ProfileView_viewedId_createdAt_idx" ON "ProfileView"("viewedId", "createdAt");
