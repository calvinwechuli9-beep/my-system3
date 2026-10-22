CREATE TABLE IF NOT EXISTS users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Records Officer', 'Administrator')),
  is_active INTEGER NOT NULL DEFAULT 1,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS land_records (
  record_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_number TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  national_id TEXT NOT NULL,
  parcel_size REAL NOT NULL CHECK (parcel_size > 0),
  location TEXT NOT NULL,
  land_use TEXT NOT NULL,
  registration_date TEXT NOT NULL,
  deed_path TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'DUPLICATE')),
  created_by INTEGER NOT NULL REFERENCES users(user_id),
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_land_title ON land_records(title_number);

CREATE TABLE IF NOT EXISTS audit_log (
  log_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  record_id INTEGER REFERENCES land_records(record_id),
  action TEXT NOT NULL,
  record_ref TEXT,
  logged_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
