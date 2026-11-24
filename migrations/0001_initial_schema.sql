CREATE TABLE store_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  tax_rate_basis_points INTEGER NOT NULL DEFAULT 0 CHECK (tax_rate_basis_points >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  access_key_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE COLLATE NOCASE,
  barcode TEXT UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  reorder_level INTEGER NOT NULL DEFAULT 5 CHECK (reorder_level >= 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX products_name_idx ON products(name COLLATE NOCASE);
CREATE INDEX products_category_idx ON products(category COLLATE NOCASE);

CREATE TABLE sales (
  receipt_number TEXT PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  cashier_id TEXT NOT NULL REFERENCES users(id),
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  tax_cents INTEGER NOT NULL CHECK (tax_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  cash_received_cents INTEGER NOT NULL CHECK (cash_received_cents >= total_cents),
  change_cents INTEGER NOT NULL CHECK (change_cents >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX sales_created_at_idx ON sales(created_at DESC);

CREATE TABLE sale_items (
  id TEXT PRIMARY KEY,
  receipt_number TEXT NOT NULL REFERENCES sales(receipt_number) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  line_total_cents INTEGER NOT NULL CHECK (line_total_cents >= 0)
);

CREATE INDEX sale_items_receipt_idx ON sale_items(receipt_number);

CREATE TABLE inventory_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  quantity_delta INTEGER NOT NULL CHECK (quantity_delta != 0),
  reason TEXT NOT NULL,
  reference TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX inventory_movements_created_idx ON inventory_movements(created_at DESC);
CREATE INDEX inventory_movements_product_idx ON inventory_movements(product_id, created_at DESC);
