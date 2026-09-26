CREATE TYPE "VendorContactStatus" AS ENUM ('NEW', 'READ', 'REPLIED', 'CLOSED');

CREATE TABLE "VendorProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "businessName" TEXT NOT NULL,
  "bio" TEXT,
  "city" TEXT,
  "state" TEXT,
  "serviceAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VendorProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Printer" (
  "id" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "model" TEXT,
  "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "materials" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "minOrderQuantity" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Printer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VendorContact" (
  "id" TEXT NOT NULL,
  "vendorId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "phone" TEXT,
  "status" "VendorContactStatus" NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VendorContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VendorProfile_userId_key" ON "VendorProfile"("userId");
CREATE UNIQUE INDEX "VendorProfile_slug_key" ON "VendorProfile"("slug");
CREATE INDEX "VendorProfile_city_state_isPublished_idx" ON "VendorProfile"("city", "state", "isPublished");
CREATE INDEX "Printer_vendorId_isActive_idx" ON "Printer"("vendorId", "isActive");
CREATE INDEX "VendorContact_vendorId_status_createdAt_idx" ON "VendorContact"("vendorId", "status", "createdAt");
CREATE INDEX "VendorContact_buyerId_createdAt_idx" ON "VendorContact"("buyerId", "createdAt");

ALTER TABLE "VendorProfile" ADD CONSTRAINT "VendorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Printer" ADD CONSTRAINT "Printer_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorContact" ADD CONSTRAINT "VendorContact_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorContact" ADD CONSTRAINT "VendorContact_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
