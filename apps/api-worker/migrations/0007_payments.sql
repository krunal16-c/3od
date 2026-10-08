PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY NOT NULL,
  order_id TEXT NOT NULL UNIQUE,
  buyer_id TEXT NOT NULL,
  vendor_id TEXT NOT NULL,
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  currency TEXT NOT NULL CHECK (currency = 'INR'),
  state TEXT NOT NULL CHECK (state IN ('CREATED', 'REQUIRES_ACTION', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED', 'CANCELLED')),
  provider TEXT NOT NULL,
  provider_payment_id TEXT,
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (buyer_id, idempotency_key),
  FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE RESTRICT,
  FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE RESTRICT,
  FOREIGN KEY (vendor_id) REFERENCES users (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS payments_buyer_created_idx ON payments (buyer_id, created_at);
CREATE INDEX IF NOT EXISTS payments_vendor_created_idx ON payments (vendor_id, created_at);

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id TEXT PRIMARY KEY NOT NULL,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  processed_at TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (provider, provider_event_id)
);
