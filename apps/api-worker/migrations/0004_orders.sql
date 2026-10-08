PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY NOT NULL,
  buyer_id TEXT NOT NULL,
  vendor_id TEXT NOT NULL,
  rfq_id TEXT NOT NULL UNIQUE,
  quote_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('ACCEPTED', 'AWAITING_PAYMENT', 'IN_PRODUCTION', 'QUALITY_CHECK', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'DISPUTED')),
  pickup_address TEXT,
  shipping_address TEXT,
  tracking_number TEXT,
  delivery_confirmed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE RESTRICT,
  FOREIGN KEY (vendor_id) REFERENCES users (id) ON DELETE RESTRICT,
  FOREIGN KEY (rfq_id) REFERENCES rfqs (id) ON DELETE RESTRICT,
  FOREIGN KEY (quote_id) REFERENCES quotes (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS orders_buyer_created_idx ON orders (buyer_id, created_at);
CREATE INDEX IF NOT EXISTS orders_vendor_created_idx ON orders (vendor_id, created_at);
CREATE INDEX IF NOT EXISTS orders_status_updated_idx ON orders (status, updated_at);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ORDER_CREATED', 'ORDER_STATUS_CHANGED', 'DELIVERY_CONFIRMED')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (user_id, created_at);
