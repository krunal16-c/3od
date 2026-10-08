-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('ACCEPTED', 'AWAITING_PAYMENT', 'IN_PRODUCTION', 'QUALITY_CHECK', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'DISPUTED');

CREATE TYPE "NotificationType" AS ENUM ('ORDER_CREATED', 'ORDER_STATUS_CHANGED', 'DELIVERY_CONFIRMED');

CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "rfqId" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'ACCEPTED',
  "pickupAddress" TEXT,
  "shippingAddress" TEXT,
  "trackingNumber" TEXT,
  "deliveryConfirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Order_rfqId_key" ON "Order"("rfqId");
CREATE UNIQUE INDEX "Order_quoteId_key" ON "Order"("quoteId");
CREATE INDEX "Order_buyerId_createdAt_idx" ON "Order"("buyerId", "createdAt");
CREATE INDEX "Order_vendorId_createdAt_idx" ON "Order"("vendorId", "createdAt");
CREATE INDEX "Order_status_updatedAt_idx" ON "Order"("status", "updatedAt");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
