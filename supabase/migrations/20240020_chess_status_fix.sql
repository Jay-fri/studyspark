-- Fix chess_games status constraint to include multiplayer statuses
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.chess_games
  DROP CONSTRAINT IF EXISTS chess_games_status_check;

ALTER TABLE public.chess_games
  ADD CONSTRAINT chess_games_status_check
  CHECK (status IN ('active', 'completed', 'abandoned', 'waiting', 'declined'));
