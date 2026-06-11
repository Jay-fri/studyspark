-- Add bot_id so past AI games can display the exact bot played against.
-- Add winner_id for reliable win/loss display in past games (independent of
-- which player wrote the result field).
ALTER TABLE public.chess_games
  ADD COLUMN IF NOT EXISTS bot_id TEXT,
  ADD COLUMN IF NOT EXISTS winner_id UUID REFERENCES public.profiles(id);
