-- 1. Create Word Sets Table
CREATE TABLE IF NOT EXISTS public.word_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    words JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_custom BOOLEAN DEFAULT true,
    word_metadata JSONB,
    level_customizations JSONB
);

-- Index on upper(code) for fast lookups by spelling set code
CREATE INDEX IF NOT EXISTS idx_word_sets_code ON public.word_sets (upper(code));

-- 2. Create Practice History Table
CREATE TABLE IF NOT EXISTS public.practice_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    correct_count INTEGER NOT NULL,
    total_words INTEGER NOT NULL,
    streak INTEGER DEFAULT 0,
    list_code TEXT NOT NULL,
    list_name TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '[]'::jsonb,
    student_name TEXT,
    student_class TEXT,
    user_id UUID
);

-- Index on list_code for practice history lookup
CREATE INDEX IF NOT EXISTS idx_practice_history_list_code ON public.practice_history (list_code);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.word_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_history ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies (Allow public/anonymous read & write access)
DROP POLICY IF EXISTS "Allow public read on word_sets" ON public.word_sets;
CREATE POLICY "Allow public read on word_sets" ON public.word_sets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on word_sets" ON public.word_sets;
CREATE POLICY "Allow public insert on word_sets" ON public.word_sets FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on word_sets" ON public.word_sets;
CREATE POLICY "Allow public update on word_sets" ON public.word_sets FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete on word_sets" ON public.word_sets;
CREATE POLICY "Allow public delete on word_sets" ON public.word_sets FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read on practice_history" ON public.practice_history;
CREATE POLICY "Allow public read on practice_history" ON public.practice_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on practice_history" ON public.practice_history;
CREATE POLICY "Allow public insert on practice_history" ON public.practice_history FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on practice_history" ON public.practice_history;
CREATE POLICY "Allow public update on practice_history" ON public.practice_history FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow public delete on practice_history" ON public.practice_history;
CREATE POLICY "Allow public delete on practice_history" ON public.practice_history FOR DELETE USING (true);
