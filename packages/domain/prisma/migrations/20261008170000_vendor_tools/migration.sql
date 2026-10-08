CREATE TABLE "PrinterBlackout" (
  "id" TEXT NOT NULL,
  "printerId" TEXT NOT NULL,
  "startsOn" TIMESTAMP(3) NOT NULL,
  "endsOn" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrinterBlackout_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrinterBlackout_printerId_startsOn_endsOn_idx"
  ON "PrinterBlackout"("printerId", "startsOn", "endsOn");

ALTER TABLE "PrinterBlackout"
  ADD CONSTRAINT "PrinterBlackout_printerId_fkey"
  FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
