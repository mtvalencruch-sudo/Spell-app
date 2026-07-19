/*
# Create word_sets and practice_sessions tables for Spell It

## Purpose
Migrate the Spell It spelling-lab app from localStorage to Supabase so word sets
and practice history persist across devices and browsers. The app is a no-auth,
single-tenant classroom tool: students unlock a word set by entering a short
access code (no sign-in), and teachers manage sets after entering a device-local
passcode (UI-only gate, not stored in the database). Practice sessions are
attributed by student name + class, not by user id.

## 1. New Tables

### `word_sets`
Stores teacher-created spelling sets. Students look one up by its `code`.
- `code` (text, primary key) — short uppercase access code, e.g. "SDU4"
- `name` (text, not null) — display name of the set
- `words` (text[], not null default '{}') — the spelling words, lowercased
- `word_metadata` (jsonb, default '{}') — per-word clue data keyed by word:
  `{ "cat": { "definition": "...", "pictureUrl": "..." } }`
- `level_customizations` (jsonb, default '{}') — per-level clue visibility:
  `{ "4": { "showDefinition": true, "showPicture": true } }`
- `is_custom` (boolean, default true) — true for teacher-created sets
- `created_at` (timestamptz, default now())

### `practice_sessions`
One row per completed practice session. Drives the Progress and Teacher reports.
- `id` (uuid, primary key, default gen_random_uuid())
- `set_date` (timestamptz, not null, default now()) — when the session ended
- `correct_count` (int, not null) — words spelled correctly
- `total_words` (int, not null) — words attempted
- `streak` (int, not null default 0) — streak value at session time
- `list_code` (text, not null) — the word_sets.code practiced
- `list_name` (text, not null) — snapshot of the set name at session time
- `details` (jsonb, not null default '[]') — per-word attempt records:
  `[{ "word": "cat", "correct": true, "userAttempt": "cat" }]`
- `student_name` (text) — optional, from session prompt
- `student_class` (text) — optional, from session prompt
- `created_at` (timestamptz, default now())

### Indexes
- `practice_sessions_list_code_idx` on `practice_sessions.list_code` — speeds up
  the Progress and Teacher reports which filter history by set code.
- `practice_sessions_set_date_idx` on `practice_sessions.set_date DESC` — speeds
  up "recent activity" and streak calculations.

## 2. Security — Row Level Security

The app has NO sign-in screen. The frontend talks to Supabase with the anon key
for its entire lifetime, so every policy MUST include the `anon` role or the app
would see empty tables. Data is intentionally public/shared within the classroom
(one device, many students; teachers share codes aloud), so `USING (true)` is the
correct predicate here — it is not a fallback around a real ownership check.

- `word_sets`: anon + authenticated can SELECT (students fetch by code),
  INSERT/UPDATE/DELETE (teacher CRUD via the same anon client).
- `practice_sessions`: anon + authenticated can SELECT (progress/reports),
  INSERT (students record sessions), DELETE (teacher can reset logs).
  UPDATE is intentionally omitted — sessions are write-once.

## 3. Important Notes
1. This migration is idempotent: uses `IF NOT EXISTS` for tables/indexes and
   `DROP POLICY IF EXISTS` before each `CREATE POLICY`.
2. No `user_id` columns and no foreign keys to `auth.users` — there is no auth.
3. `practice_sessions.list_code` is a plain text column (not a FK to word_sets)
   so session history survives even if a teacher deletes the originating set.
*/

CREATE TABLE IF NOT EXISTS word_sets (
  code text PRIMARY KEY,
  name text NOT NULL,
  words text[] NOT NULL DEFAULT '{}',
  word_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  level_customizations jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_custom boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_date timestamptz NOT NULL DEFAULT now(),
  correct_count integer NOT NULL,
  total_words integer NOT NULL,
  streak integer NOT NULL DEFAULT 0,
  list_code text NOT NULL,
  list_name text NOT NULL,
  details jsonb NOT NULL DEFAULT '[]'::jsonb,
  student_name text,
  student_class text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS practice_sessions_list_code_idx
  ON practice_sessions(list_code);

CREATE INDEX IF NOT EXISTS practice_sessions_set_date_idx
  ON practice_sessions(set_date DESC);

ALTER TABLE word_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;

-- word_sets policies (classroom-shared, no auth)
DROP POLICY IF EXISTS "anon_select_word_sets" ON word_sets;
CREATE POLICY "anon_select_word_sets" ON word_sets FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_word_sets" ON word_sets;
CREATE POLICY "anon_insert_word_sets" ON word_sets FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_word_sets" ON word_sets;
CREATE POLICY "anon_update_word_sets" ON word_sets FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_word_sets" ON word_sets;
CREATE POLICY "anon_delete_word_sets" ON word_sets FOR DELETE
  TO anon, authenticated USING (true);

-- practice_sessions policies (classroom-shared, no auth)
DROP POLICY IF EXISTS "anon_select_practice_sessions" ON practice_sessions;
CREATE POLICY "anon_select_practice_sessions" ON practice_sessions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_practice_sessions" ON practice_sessions;
CREATE POLICY "anon_insert_practice_sessions" ON practice_sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_practice_sessions" ON practice_sessions;
CREATE POLICY "anon_delete_practice_sessions" ON practice_sessions FOR DELETE
  TO anon, authenticated USING (true);
