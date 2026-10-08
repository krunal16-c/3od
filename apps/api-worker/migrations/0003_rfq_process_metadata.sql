ALTER TABLE rfqs ADD COLUMN process TEXT NOT NULL DEFAULT '3d_printing';
ALTER TABLE rfqs ADD COLUMN tolerance TEXT;
ALTER TABLE rfqs ADD COLUMN location TEXT;
ALTER TABLE rfqs ADD COLUMN shipping_preference TEXT;

CREATE INDEX IF NOT EXISTS rfqs_process_state_created_idx
  ON rfqs (process, state, created_at);
