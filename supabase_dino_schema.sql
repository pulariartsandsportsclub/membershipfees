-- ==============================================================================
-- Pulari Arts & Sports Club – Dino Runner Arcade Leaderboard Database Schema
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Create the dino_leaderboard table
CREATE TABLE IF NOT EXISTS public.dino_leaderboard (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    player_name TEXT NOT NULL,
    high_score BIGINT NOT NULL DEFAULT 0,
    distance_meters INTEGER NOT NULL DEFAULT 0,
    cacti_dodged INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create Index on high_score for fast Top-5 sorting
CREATE INDEX IF NOT EXISTS idx_dino_leaderboard_score 
ON public.dino_leaderboard (high_score DESC);

-- 3. Create Case-Insensitive Unique Index on player_name (1 record per player)
CREATE UNIQUE INDEX IF NOT EXISTS idx_dino_leaderboard_player_unique 
ON public.dino_leaderboard (LOWER(TRIM(player_name)));

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.dino_leaderboard ENABLE ROW LEVEL SECURITY;

-- 5. Set up RLS Policies for Public / Anon Access (Matches Club Arcade Leaderboards)
DROP POLICY IF EXISTS "Allow public read on dino_leaderboard" ON public.dino_leaderboard;
CREATE POLICY "Allow public read on dino_leaderboard" 
ON public.dino_leaderboard
FOR SELECT 
TO anon, authenticated 
USING (true);

DROP POLICY IF EXISTS "Allow public insert on dino_leaderboard" ON public.dino_leaderboard;
CREATE POLICY "Allow public insert on dino_leaderboard" 
ON public.dino_leaderboard
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update on dino_leaderboard" ON public.dino_leaderboard;
CREATE POLICY "Allow public update on dino_leaderboard" 
ON public.dino_leaderboard
FOR UPDATE 
TO anon, authenticated 
USING (true)
WITH CHECK (true);

-- 6. Verification Query (Returns Top 5)
SELECT player_name, high_score, distance_meters, cacti_dodged, created_at 
FROM public.dino_leaderboard 
ORDER BY high_score DESC 
LIMIT 5;
