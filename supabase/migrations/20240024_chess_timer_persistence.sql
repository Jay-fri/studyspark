-- Store live clock values so timers survive page reloads
ALTER TABLE public.chess_games
  ADD COLUMN IF NOT EXISTS white_time_ms BIGINT,
  ADD COLUMN IF NOT EXISTS black_time_ms BIGINT;
