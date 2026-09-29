-- ==============================================================================
-- Pulari Arts & Sports Club – Tetris Arcade Leaderboard Database Schema
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Create the tetris_leaderboard table
CREATE TABLE IF NOT EXISTS public.tetris_leaderboard (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    player_name TEXT NOT NULL,
    high_score BIGINT NOT NULL DEFAULT 0,
    lines INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create Index on high_score for instant Top-5 sorting
CREATE INDEX IF NOT EXISTS idx_tetris_leaderboard_score 
ON public.tetris_leaderboard (high_score DESC);

-- 3. Create Case-Insensitive Unique Index on player_name for clean per-player upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_tetris_leaderboard_player_unique 
ON public.tetris_leaderboard (LOWER(TRIM(player_name)));

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.tetris_leaderboard ENABLE ROW LEVEL SECURITY;

-- 5. Set up RLS Policies for Public/Anon Access (Matches Club Arcade Leaderboard)
DROP POLICY IF EXISTS "Allow public read on tetris_leaderboard" ON public.tetris_leaderboard;
CREATE POLICY "Allow public read on tetris_leaderboard" 
ON public.tetris_leaderboard
FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow public insert on tetris_leaderboard" ON public.tetris_leaderboard;
CREATE POLICY "Allow public insert on tetris_leaderboard" 
ON public.tetris_leaderboard
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on tetris_leaderboard" ON public.tetris_leaderboard;
CREATE POLICY "Allow public update on tetris_leaderboard" 
ON public.tetris_leaderboard
FOR UPDATE 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

-- 6. Insert Initial Demo Top 5 High Scores
INSERT INTO public.tetris_leaderboard (player_name, high_score, lines, level)
VALUES 
    ('Pulari Pro', 14500, 38, 4),
    ('Kaif', 11200, 30, 4),
    ('Shaheer', 8600, 24, 3),
    ('Anwar', 6400, 18, 2),
    ('Shijas', 4200, 12, 2)
ON CONFLICT (LOWER(TRIM(player_name))) DO NOTHING;

-- 7. Verification Query (Returns Top 5)
SELECT player_name, high_score, lines, level, created_at 
FROM public.tetris_leaderboard 
ORDER BY high_score DESC 
LIMIT 5;
