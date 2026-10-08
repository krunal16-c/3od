CREATE TYPE "ManufacturingProcess" AS ENUM (
  'three_d_printing',
  'cnc_milling',
  'cnc_turning',
  'laser_cutting',
  'fabrication',
  'waterjet_cutting',
  'vacuum_forming',
  'injection_molding'
);

ALTER TABLE "Rfq"
  ADD COLUMN "process" "ManufacturingProcess" NOT NULL DEFAULT 'three_d_printing',
  ADD COLUMN "finish" TEXT,
  ADD COLUMN "tolerance" TEXT,
  ADD COLUMN "location" TEXT,
  ADD COLUMN "shippingPreference" TEXT;

ALTER TABLE "Printer"
  ADD COLUMN "processes" "ManufacturingProcess"[] NOT NULL DEFAULT ARRAY['three_d_printing']::"ManufacturingProcess"[],
  ADD COLUMN "leadTimeDays" INTEGER NOT NULL DEFAULT 5;

CREATE INDEX "Rfq_process_state_createdAt_idx" ON "Rfq"("process", "state", "createdAt");
