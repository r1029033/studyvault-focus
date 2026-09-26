PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_info (version INTEGER PRIMARY KEY CHECK (version = 1));
INSERT OR IGNORE INTO schema_info (version) VALUES (1);
CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY, title TEXT NOT NULL CHECK (length(trim(title)) > 0), description TEXT,
  due_at TEXT, category_id TEXT NOT NULL REFERENCES categories(id),
  status TEXT NOT NULL CHECK (status IN ('Active','Completed')),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, completed_at TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, type TEXT NOT NULL CHECK (type IN ('Focus','Break')),
  planned_seconds INTEGER NOT NULL CHECK (planned_seconds > 0), actual_seconds INTEGER,
  started_at TEXT NOT NULL, finished_at TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('Running','Paused','Completed','Cancelled')),
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL, context_snapshot TEXT
);
CREATE TABLE IF NOT EXISTS session_pauses (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  paused_at TEXT NOT NULL, resumed_at TEXT
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS log_events (
  id TEXT PRIMARY KEY, event_type TEXT NOT NULL, occurred_at TEXT NOT NULL,
  timezone_offset TEXT NOT NULL, source_app TEXT NOT NULL, entity_id TEXT NOT NULL,
  markdown_payload TEXT NOT NULL, destination_path TEXT NOT NULL,
  delivery_state TEXT NOT NULL CHECK (delivery_state IN ('Pending','Written','Failed')), last_error TEXT
);
CREATE INDEX IF NOT EXISTS idx_tasks_status_due ON tasks(status, due_at);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_log_events_state ON log_events(delivery_state, occurred_at);
INSERT OR IGNORE INTO categories (id, name, created_at) VALUES ('category-uncategorized','Uncategorized','1970-01-01T00:00:00.000Z');
