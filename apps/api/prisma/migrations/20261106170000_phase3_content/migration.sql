-- Phase 3: storefront content, contact inbox and support enhancements.

ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';

CREATE TYPE "ContactMessageStatus" AS ENUM ('NEW', 'READ', 'REPLIED');

ALTER TABLE "SupportTicket" ADD COLUMN "orderId" TEXT;

ALTER TABLE "TicketMessage"
  ADD COLUMN "isStaff" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "attachments" JSONB NOT NULL DEFAULT '[]';

CREATE TABLE "ContactMessage" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" "ContactMessageStatus" NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContactMessage_status_createdAt_idx" ON "ContactMessage"("status", "createdAt");
CREATE INDEX "ContactMessage_email_idx" ON "ContactMessage"("email");

CREATE TABLE "FaqItem" (
  "id" TEXT NOT NULL,
  "questionAr" TEXT NOT NULL,
  "questionEn" TEXT NOT NULL,
  "answerAr" TEXT NOT NULL,
  "answerEn" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'GENERAL',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FaqItem_category_sortOrder_idx" ON "FaqItem"("category", "sortOrder");
CREATE INDEX "FaqItem_isActive_sortOrder_idx" ON "FaqItem"("isActive", "sortOrder");

CREATE TABLE "Page" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "titleAr" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "contentAr" TEXT NOT NULL,
  "contentEn" TEXT NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");

CREATE TABLE "Setting" (
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);
