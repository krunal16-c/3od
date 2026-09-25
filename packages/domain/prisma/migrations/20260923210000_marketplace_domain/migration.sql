CREATE TYPE "UserRole" AS ENUM ('BUYER', 'PRINTER_OWNER', 'ADMIN');
CREATE TYPE "RfqState" AS ENUM ('DRAFT', 'SUBMITTED', 'OPEN_FOR_QUOTES', 'QUOTES_RECEIVED', 'QUOTE_SELECTED', 'EXPIRED', 'CANCELLED', 'REJECTED');
CREATE TYPE "QuoteState" AS ENUM ('DRAFT', 'SUBMITTED', 'VISIBLE_TO_BUYER', 'ACCEPTED', 'REJECTED', 'EXPIRED');
CREATE TYPE "RfqFileState" AS ENUM ('PENDING', 'VALIDATED', 'REJECTED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "displayName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

CREATE TABLE "Rfq" (
  "id" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "state" "RfqState" NOT NULL DEFAULT 'DRAFT',
  "description" TEXT,
  "quantity" INTEGER,
  "material" TEXT,
  "deadline" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Rfq_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Rfq_buyerId_idempotencyKey_key" ON "Rfq"("buyerId", "idempotencyKey");
CREATE INDEX "Rfq_buyerId_state_createdAt_idx" ON "Rfq"("buyerId", "state", "createdAt");
CREATE INDEX "Rfq_state_createdAt_idx" ON "Rfq"("state", "createdAt");

CREATE TABLE "RfqFile" (
  "id" TEXT NOT NULL,
  "rfqId" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "originalFilename" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "byteSize" INTEGER NOT NULL,
  "state" "RfqFileState" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RfqFile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RfqFile_storageKey_key" ON "RfqFile"("storageKey");
CREATE INDEX "RfqFile_rfqId_state_idx" ON "RfqFile"("rfqId", "state");

CREATE TABLE "Quote" (
  "id" TEXT NOT NULL,
  "rfqId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "state" "QuoteState" NOT NULL DEFAULT 'DRAFT',
  "totalAmountInr" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "deliveryDate" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Quote_rfqId_state_createdAt_idx" ON "Quote"("rfqId", "state", "createdAt");
CREATE INDEX "Quote_supplierId_state_createdAt_idx" ON "Quote"("supplierId", "state", "createdAt");

CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditEvent_entityType_entityId_createdAt_idx" ON "AuditEvent"("entityType", "entityId", "createdAt");
CREATE INDEX "AuditEvent_actorUserId_createdAt_idx" ON "AuditEvent"("actorUserId", "createdAt");

ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Rfq" ADD CONSTRAINT "Rfq_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RfqFile" ADD CONSTRAINT "RfqFile_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
