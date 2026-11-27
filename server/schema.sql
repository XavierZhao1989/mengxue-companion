-- 启蒙小笺 PostgreSQL Schema
-- Supports Neon Serverless Postgres / standard PostgreSQL 15+

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('mengxue', 'poetry', 'shenglv')),
  age_groups JSONB NOT NULL DEFAULT '["3-4","5-6"]'::jsonb,
  duration_minutes INTEGER NOT NULL DEFAULT 5,
  summary TEXT NOT NULL DEFAULT '',
  parent_guide TEXT NOT NULL DEFAULT '',
  published BOOLEAN NOT NULL DEFAULT TRUE,
  lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  char_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS children (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  age_label TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL DEFAULT '🦁',
  streak_days INTEGER NOT NULL DEFAULT 0,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  today_lesson_id TEXT NOT NULL DEFAULT '',
  plan_lesson_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_lesson_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS checkins (
  id SERIAL PRIMARY KEY,
  child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  checkin_date TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, checkin_date)
);

CREATE TABLE IF NOT EXISTS reading_progress (
  child_id TEXT NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  line_index INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (child_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS hardware_devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  model TEXT NOT NULL,
  connected BOOLEAN NOT NULL DEFAULT TRUE,
  battery INTEGER NOT NULL DEFAULT 86,
  firmware TEXT NOT NULL DEFAULT 'v2.4.1',
  last_synced_at TEXT NOT NULL DEFAULT '刚刚同步'
);
