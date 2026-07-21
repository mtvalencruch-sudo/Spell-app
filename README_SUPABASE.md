# Supabase Database Setup & Migration Guide

Your **Spell-app** is configured to connect to Supabase for saving and loading spelling `WordSets` and student `PracticeHistory`.

Follow these steps to set up the database tables in your Supabase project:

## Step 1: Open Supabase Dashboard
1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.

## Step 2: Run the SQL Migration
1. Click on **SQL Editor** in the left sidebar menu (or press `Shift + S`).
2. Click **New query**.
3. Copy and paste the contents of `supabase/migrations/20260721000000_create_spelling_tables.sql` into the SQL Editor window.
4. Click **Run** (or press `Ctrl/Cmd + Enter`).

You should see a message: `Success. No rows returned`.

## What This Migration Creates:
- **`word_sets` table**: Stores spelling word lists, custom codes (e.g. `SDU4`), target words, definitions, picture URLs, and level customizations.
- **`practice_history` table**: Stores student spelling test attempts, scores, streaks, student names, and classes.
- **Row Level Security (RLS) Policies**: Allows public & student anonymous read/write access so the app can create and fetch lists without mandatory login screens.
