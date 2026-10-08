ALTER TABLE quotes ADD COLUMN idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS quotes_supplier_idempotency_idx
  ON quotes (supplier_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
