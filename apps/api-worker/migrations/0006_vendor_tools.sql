ALTER TABLE printers ADD COLUMN lead_time_days INTEGER NOT NULL DEFAULT 5 CHECK (lead_time_days > 0 AND lead_time_days <= 365);
ALTER TABLE printers ADD COLUMN processes TEXT NOT NULL DEFAULT '["3d_printing"]';

CREATE TABLE IF NOT EXISTS printer_blackouts (
  id TEXT PRIMARY KEY NOT NULL,
  printer_id TEXT NOT NULL,
  starts_on TEXT NOT NULL,
  ends_on TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (printer_id) REFERENCES printers (id) ON DELETE CASCADE,
  CHECK (date(starts_on) <= date(ends_on))
);

CREATE INDEX IF NOT EXISTS printer_blackouts_printer_dates_idx
  ON printer_blackouts (printer_id, starts_on, ends_on);
