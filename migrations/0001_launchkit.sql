-- LaunchKit Minimal schema for Cloudflare D1, SQLite, or Turso-style databases.

CREATE TABLE IF NOT EXISTS launch_projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  tagline     TEXT NOT NULL,
  description TEXT NOT NULL,
  audience    TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'draft',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_launch_projects_status
  ON launch_projects (status, updated_at);

CREATE TABLE IF NOT EXISTS launch_signups (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  email      TEXT NOT NULL,
  source     TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES launch_projects (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_launch_signups_project_email
  ON launch_signups (project_id, email);

CREATE INDEX IF NOT EXISTS idx_launch_signups_project_created
  ON launch_signups (project_id, created_at);

CREATE TABLE IF NOT EXISTS launch_feedback (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  votes      INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES launch_projects (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_launch_feedback_project_votes
  ON launch_feedback (project_id, votes DESC, created_at DESC);
