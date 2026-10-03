-- ==============================================================================
-- Pulari Arts & Sports Club – Balloon Pop Arcade Leaderboard Database Schema
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Create the balloon_leaderboard table
CREATE TABLE IF NOT EXISTS public.balloon_leaderboard (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    player_name TEXT NOT NULL,
    high_score BIGINT NOT NULL DEFAULT 0,
    balloons_popped INTEGER NOT NULL DEFAULT 0,
    accuracy INTEGER NOT NULL DEFAULT 100,
    max_combo INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create Index on high_score for instant Top-5 sorting
CREATE INDEX IF NOT EXISTS idx_balloon_leaderboard_score 
ON public.balloon_leaderboard (high_score DESC);

-- 3. Create Case-Insensitive Unique Index on player_name for clean per-player upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_balloon_leaderboard_player_unique 
ON public.balloon_leaderboard (LOWER(TRIM(player_name)));

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.balloon_leaderboard ENABLE ROW LEVEL SECURITY;

-- 5. Set up RLS Policies for Public/Anon Access (Matches Club Arcade Leaderboards)
DROP POLICY IF EXISTS "Allow public read on balloon_leaderboard" ON public.balloon_leaderboard;
CREATE POLICY "Allow public read on balloon_leaderboard" 
ON public.balloon_leaderboard
FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow public insert on balloon_leaderboard" ON public.balloon_leaderboard;
CREATE POLICY "Allow public insert on balloon_leaderboard" 
ON public.balloon_leaderboard
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on balloon_leaderboard" ON public.balloon_leaderboard;
CREATE POLICY "Allow public update on balloon_leaderboard" 
ON public.balloon_leaderboard
FOR UPDATE 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

-- 6. Verification Query (Returns Top 5)
SELECT player_name, high_score, balloons_popped, accuracy, max_combo, created_at 
FROM public.balloon_leaderboard 
ORDER BY high_score DESC 
LIMIT 5;
