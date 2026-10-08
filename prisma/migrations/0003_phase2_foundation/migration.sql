-- Phase 2 foundation: wallet charging, review interaction key, chat metadata and admin 2FA.
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED');

ALTER TABLE "ad_clicks"
  ADD COLUMN "chargedAmount" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "walletTransactionId" TEXT;

ALTER TABLE "conversations"
  ADD COLUMN "lawyerId" TEXT,
  ADD COLUMN "consentToStore" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "closedAt" TIMESTAMP(3);

ALTER TABLE "wallet_transactions"
  ADD COLUMN "balanceAfter" BIGINT,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "metadata" JSONB;

CREATE TABLE "admin_two_factors" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "secretCiphertext" TEXT NOT NULL,
  "iv" TEXT NOT NULL,
  "authTag" TEXT NOT NULL,
  "recoveryCodeHashes" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "admin_two_factors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ad_clicks_walletTransactionId_key"
  ON "ad_clicks"("walletTransactionId");
CREATE UNIQUE INDEX "reviews_interactionRef_key"
  ON "reviews"("interactionRef");
CREATE INDEX "conversations_userId_status_lastMessageAt_idx"
  ON "conversations"("userId", "status", "lastMessageAt");
CREATE INDEX "conversations_lawyerId_status_lastMessageAt_idx"
  ON "conversations"("lawyerId", "status", "lastMessageAt");
CREATE UNIQUE INDEX "wallet_transactions_idempotencyKey_key"
  ON "wallet_transactions"("idempotencyKey");
CREATE INDEX "wallet_transactions_referenceId_idx"
  ON "wallet_transactions"("referenceId");
CREATE UNIQUE INDEX "admin_two_factors_userId_key"
  ON "admin_two_factors"("userId");

ALTER TABLE "ad_clicks"
  ADD CONSTRAINT "ad_clicks_walletTransactionId_fkey"
  FOREIGN KEY ("walletTransactionId")
  REFERENCES "wallet_transactions"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_lawyerId_fkey"
  FOREIGN KEY ("lawyerId")
  REFERENCES "lawyers"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "admin_two_factors"
  ADD CONSTRAINT "admin_two_factors_userId_fkey"
  FOREIGN KEY ("userId")
  REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
