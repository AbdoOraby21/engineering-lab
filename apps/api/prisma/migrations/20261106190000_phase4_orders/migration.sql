-- Phase 4: Orders, shipping zones, coupons, payment proofs, returns, notifications.

-- Enums
CREATE TYPE "PaymentMethod" AS ENUM ('VODAFONE_CASH', 'INSTAPAY', 'COD');
CREATE TYPE "OrderStatus" AS ENUM (
  'PENDING_PAYMENT',
  'PENDING_PAYMENT_REVIEW',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'EXPIRED',
  'RETURN_REQUESTED',
  'RETURNED',
  'REFUNDED'
);
CREATE TYPE "PaymentProofStatus" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED');
CREATE TYPE "ReturnRequestStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED');
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'WHATSAPP');
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- Order number sequence
CREATE SEQUENCE IF NOT EXISTS "order_number_seq" START 1;

-- Add relations to existing User model
-- (Cart links via Cart.userId unique; no User.cartId column needed)

-- ShippingZone
CREATE TABLE "ShippingZone" (
  "id" TEXT NOT NULL,
  "governorate" TEXT NOT NULL,
  "feeEgp" INTEGER NOT NULL,
  "estimatedDaysMin" INTEGER NOT NULL DEFAULT 1,
  "estimatedDaysMax" INTEGER NOT NULL DEFAULT 3,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShippingZone_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ShippingZone_governorate_key" ON "ShippingZone"("governorate");
CREATE INDEX "ShippingZone_isActive_governorate_idx" ON "ShippingZone"("isActive", "governorate");

-- Coupon
CREATE TABLE "Coupon" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "value" INTEGER NOT NULL,
  "minSubtotal" INTEGER,
  "maxDiscount" INTEGER,
  "usageLimit" INTEGER,
  "perUserLimit" INTEGER,
  "startsAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX "Coupon_code_isActive_idx" ON "Coupon"("code", "isActive");
CREATE INDEX "Coupon_expiresAt_isActive_idx" ON "Coupon"("expiresAt", "isActive");

-- CouponRedemption
CREATE TABLE "CouponRedemption" (
  "id" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CouponRedemption_couponId_userId_key" ON "CouponRedemption"("couponId", "userId");
CREATE INDEX "CouponRedemption_couponId_idx" ON "CouponRedemption"("couponId");

-- Order
CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "paymentMethod" "PaymentMethod" NOT NULL,
  "addressSnapshot" JSONB NOT NULL,
  "contactName" TEXT NOT NULL,
  "contactPhone" TEXT NOT NULL,
  "contactEmail" TEXT NOT NULL,
  "subtotal" INTEGER NOT NULL,
  "discountTotal" INTEGER NOT NULL DEFAULT 0,
  "shippingFee" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL,
  "couponCode" TEXT,
  "customerNote" TEXT,
  "adminNote" TEXT,
  "paymentDeadlineAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "shippedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "cancelReason" TEXT,
  "trackingCompany" TEXT,
  "trackingNumber" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX "Order_paymentDeadlineAt_status_idx" ON "Order"("paymentDeadlineAt", "status");

-- OrderItem
CREATE TABLE "OrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "variantId" TEXT,
  "qty" INTEGER NOT NULL,
  "nameAr" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "sku" TEXT NOT NULL,
  "imageUrl" TEXT,
  "unitPrice" INTEGER NOT NULL,
  "lineTotal" INTEGER NOT NULL,
  "isBundle" BOOLEAN NOT NULL DEFAULT false,
  "bundleSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE;

-- OrderStatusHistory
CREATE TABLE "OrderStatusHistory" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "from" "OrderStatus",
  "to" "OrderStatus" NOT NULL,
  "actorId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId", "createdAt");

ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE;
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL;

-- PaymentProof
CREATE TABLE "PaymentProof" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "senderPhone" TEXT NOT NULL,
  "referenceNumber" TEXT,
  "transferredAt" TIMESTAMP(3) NOT NULL,
  "amount" INTEGER NOT NULL,
  "screenshotUrl" TEXT NOT NULL,
  "status" "PaymentProofStatus" NOT NULL DEFAULT 'SUBMITTED',
  "rejectReason" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentProof_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PaymentProof_orderId_createdAt_idx" ON "PaymentProof"("orderId", "createdAt");
CREATE INDEX "PaymentProof_status_idx" ON "PaymentProof"("status");

ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE;
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL;

-- ReturnRequest
CREATE TABLE "ReturnRequest" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "photos" JSONB NOT NULL DEFAULT '[]',
  "status" "ReturnRequestStatus" NOT NULL DEFAULT 'REQUESTED',
  "resolutionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ReturnRequest_orderId_createdAt_idx" ON "ReturnRequest"("orderId", "createdAt");
CREATE INDEX "ReturnRequest_status_idx" ON "ReturnRequest"("status");

ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE;
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;

-- NotificationLog
CREATE TABLE "NotificationLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "channel" "NotificationChannel" NOT NULL,
  "template" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "NotificationLog_userId_createdAt_idx" ON "NotificationLog"("userId", "createdAt");
CREATE INDEX "NotificationLog_status_createdAt_idx" ON "NotificationLog"("status", "createdAt");

ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL;

-- Add order relations to User
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

-- Seed ShippingZone: 27 Egyptian governorates (fees in piasters; EGP = fee/100)
INSERT INTO "ShippingZone" ("id", "governorate", "feeEgp", "estimatedDaysMin", "estimatedDaysMax", "isActive", "createdAt", "updatedAt") VALUES
  ('sz-cairo', 'القاهرة', 3000, 1, 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-giza', 'الجيزة', 3500, 1, 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-alexandria', 'الإسكندرية', 4000, 1, 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-qalyubia', 'القليوبية', 4500, 2, 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-dakahlia', 'الدقهلية', 5500, 2, 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-sharqia', 'الشرقية', 6000, 2, 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-gharbia', 'الغربية', 6000, 2, 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-beheira', 'البحيرة', 6500, 2, 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-ismailia', 'الإسماعيلية', 7000, 2, 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-port-said', 'بورسعيد', 7500, 2, 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-suez', 'السويس', 7500, 2, 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-faiyum', 'الفيوم', 8000, 3, 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-minya', 'المنيا', 8500, 3, 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-asyut', 'أسيوط', 9000, 3, 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-sohag', 'سوهاج', 9500, 3, 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-qena', 'قنا', 10000, 3, 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-aswan', 'أسوان', 10500, 3, 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-luxor', 'الأقصر', 10000, 3, 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-red-sea', 'البحر الأحمر', 11000, 3, 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-new-valley', 'الوادي الجديد', 11500, 4, 7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-matrouh', 'مرسى مطروح', 12000, 4, 7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-north-sinai', 'شمال سيناء', 13000, 4, 7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-south-sinai', 'جنوب سيناء', 13500, 4, 7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-damietta', 'دمياط', 6500, 2, 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-kafr-sheikh', 'كفر الشيخ', 6500, 2, 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sz-beni-suef', 'بني سويف', 8500, 3, 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
