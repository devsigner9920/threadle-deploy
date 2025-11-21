-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slackUserId" TEXT NOT NULL,
    "slackWorkspaceId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "customInstructions" TEXT,
    "preferredStyle" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slackChannelId" TEXT NOT NULL,
    "slackThreadTs" TEXT NOT NULL,
    "messageCount" INTEGER NOT NULL,
    "firstMessageAt" DATETIME NOT NULL,
    "lastMessageAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Translation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "originalMessages" TEXT NOT NULL,
    "translatedContent" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "llmProvider" TEXT NOT NULL,
    "tokenUsage" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Translation_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Translation_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "translationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserFeedback_translationId_fkey" FOREIGN KEY ("translationId") REFERENCES "Translation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_slackUserId_key" ON "User"("slackUserId");

-- CreateIndex
CREATE INDEX "User_slackUserId_idx" ON "User"("slackUserId");

-- CreateIndex
CREATE INDEX "Conversation_slackChannelId_slackThreadTs_idx" ON "Conversation"("slackChannelId", "slackThreadTs");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_slackChannelId_slackThreadTs_key" ON "Conversation"("slackChannelId", "slackThreadTs");

-- CreateIndex
CREATE INDEX "Translation_requestedByUserId_idx" ON "Translation"("requestedByUserId");

-- CreateIndex
CREATE INDEX "Translation_conversationId_idx" ON "Translation"("conversationId");

-- CreateIndex
CREATE INDEX "UserFeedback_translationId_idx" ON "UserFeedback"("translationId");

-- CreateIndex
CREATE INDEX "UserFeedback_userId_idx" ON "UserFeedback"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");
