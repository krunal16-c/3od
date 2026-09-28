PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('BUYER', 'PRINTER_OWNER', 'ADMIN')),
  display_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sessions_user_expiry_idx ON sessions (user_id, expires_at);

CREATE TABLE IF NOT EXISTS vendor_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  bio TEXT,
  city TEXT,
  state TEXT,
  service_areas TEXT NOT NULL DEFAULT '[]',
  is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS vendor_profiles_location_idx
  ON vendor_profiles (city, state, is_published);

CREATE TABLE IF NOT EXISTS printers (
  id TEXT PRIMARY KEY NOT NULL,
  vendor_id TEXT NOT NULL,
  name TEXT NOT NULL,
  model TEXT,
  technologies TEXT NOT NULL DEFAULT '[]',
  materials TEXT NOT NULL DEFAULT '[]',
  min_order_quantity INTEGER NOT NULL DEFAULT 1 CHECK (min_order_quantity > 0),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (vendor_id) REFERENCES vendor_profiles (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS printers_vendor_active_idx ON printers (vendor_id, is_active);

CREATE TABLE IF NOT EXISTS vendor_contacts (
  id TEXT PRIMARY KEY NOT NULL,
  vendor_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  message TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL CHECK (status IN ('NEW', 'READ', 'REPLIED', 'CLOSED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (vendor_id) REFERENCES vendor_profiles (id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS vendor_contacts_vendor_status_created_idx
  ON vendor_contacts (vendor_id, status, created_at);
CREATE INDEX IF NOT EXISTS vendor_contacts_buyer_created_idx
  ON vendor_contacts (buyer_id, created_at);

CREATE TABLE IF NOT EXISTS rfqs (
  id TEXT PRIMARY KEY NOT NULL,
  buyer_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  title TEXT NOT NULL,
  state TEXT NOT NULL CHECK (
    state IN ('DRAFT', 'SUBMITTED', 'OPEN_FOR_QUOTES', 'QUOTES_RECEIVED',
      'QUOTE_SELECTED', 'EXPIRED', 'CANCELLED', 'REJECTED')
  ),
  description TEXT,
  quantity INTEGER,
  material TEXT,
  finish TEXT,
  deadline TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (buyer_id, idempotency_key),
  FOREIGN KEY (buyer_id) REFERENCES users (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS rfqs_buyer_state_created_idx
  ON rfqs (buyer_id, state, created_at);
CREATE INDEX IF NOT EXISTS rfqs_state_created_idx ON rfqs (state, created_at);

CREATE TABLE IF NOT EXISTS rfq_files (
  id TEXT PRIMARY KEY NOT NULL,
  rfq_id TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  original_filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
  state TEXT NOT NULL CHECK (state IN ('PENDING', 'VALIDATED', 'REJECTED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (rfq_id) REFERENCES rfqs (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS rfq_files_rfq_state_idx ON rfq_files (rfq_id, state);

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY NOT NULL,
  rfq_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (
    state IN ('DRAFT', 'SUBMITTED', 'VISIBLE_TO_BUYER', 'ACCEPTED', 'REJECTED', 'EXPIRED')
  ),
  total_amount_inr INTEGER NOT NULL CHECK (total_amount_inr >= 0),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  delivery_date TEXT,
  expires_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (rfq_id) REFERENCES rfqs (id) ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES users (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS quotes_rfq_state_created_idx
  ON quotes (rfq_id, state, created_at);
CREATE INDEX IF NOT EXISTS quotes_supplier_state_created_idx
  ON quotes (supplier_id, state, created_at);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY NOT NULL,
  actor_user_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS audit_events_entity_created_idx
  ON audit_events (entity_type, entity_id, created_at);
CREATE INDEX IF NOT EXISTS audit_events_actor_created_idx
  ON audit_events (actor_user_id, created_at);
