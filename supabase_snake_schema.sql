-- ==============================================================================
-- Pulari Arts & Sports Club – Retro Snake Arcade Leaderboard Database Schema
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Create the snake_leaderboard table
CREATE TABLE IF NOT EXISTS public.snake_leaderboard (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    player_name TEXT NOT NULL,
    high_score BIGINT NOT NULL DEFAULT 0,
    apples_eaten INTEGER NOT NULL DEFAULT 0,
    length INTEGER NOT NULL DEFAULT 3,
    speed_level TEXT NOT NULL DEFAULT 'Normal',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create Index on high_score for fast Top-5 sorting
CREATE INDEX IF NOT EXISTS idx_snake_leaderboard_score 
ON public.snake_leaderboard (high_score DESC);

-- 3. Create Case-Insensitive Unique Index on player_name for single clean entry per player
CREATE UNIQUE INDEX IF NOT EXISTS idx_snake_leaderboard_player_unique 
ON public.snake_leaderboard (LOWER(TRIM(player_name)));

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.snake_leaderboard ENABLE ROW LEVEL SECURITY;

-- 5. Set up RLS Policies for Public/Anon Access (Matches Club Arcade Leaderboard)
DROP POLICY IF EXISTS "Allow public read on snake_leaderboard" ON public.snake_leaderboard;
CREATE POLICY "Allow public read on snake_leaderboard" 
ON public.snake_leaderboard
FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow public insert on snake_leaderboard" ON public.snake_leaderboard;
CREATE POLICY "Allow public insert on snake_leaderboard" 
ON public.snake_leaderboard
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on snake_leaderboard" ON public.snake_leaderboard;
CREATE POLICY "Allow public update on snake_leaderboard" 
ON public.snake_leaderboard
FOR UPDATE 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

-- 6. Verification Query (Returns Top 5)
SELECT player_name, high_score, apples_eaten, length, speed_level, created_at 
FROM public.snake_leaderboard 
ORDER BY high_score DESC 
LIMIT 5;
