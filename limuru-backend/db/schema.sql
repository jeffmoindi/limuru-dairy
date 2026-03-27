-- Limuru Dairy Company — database schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS admins (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'staff',   -- 'staff' | 'super_admin'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT,
  purpose        TEXT,
  preferred_date DATE NOT NULL,
  preferred_time TEXT,
  status         TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | declined | completed
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS careers (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  department  TEXT,
  location    TEXT,
  employment_type TEXT DEFAULT 'Full-time',
  description TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open',      -- open | closed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS applications (
  id             SERIAL PRIMARY KEY,
  job_id         INTEGER REFERENCES careers(id) ON DELETE SET NULL,
  applicant_name TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT,
  cover_letter   TEXT,
  resume_path    TEXT,
  status         TEXT NOT NULL DEFAULT 'submitted', -- submitted | reviewing | interview | rejected | hired
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT,
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open',       -- open | answered | closed
  reply       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  replied_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  active        BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'KES',
  image_url   TEXT,
  category    TEXT,
  in_stock    BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stockists (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  area       TEXT,
  address    TEXT,
  latitude   NUMERIC(9,6),
  longitude  NUMERIC(9,6),
  phone      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id             SERIAL PRIMARY KEY,
  customer_name  TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | out_for_delivery | delivered | cancelled
  total          NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INTEGER REFERENCES products(id) ON DELETE SET NULL,
  quantity    INTEGER NOT NULL DEFAULT 1,
  unit_price  NUMERIC(10,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_applications_job ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
