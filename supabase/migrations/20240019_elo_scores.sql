-- Add ELO and game scores to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS chess_elo INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS draughts_wins INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scrabble_high_score INTEGER NOT NULL DEFAULT 0;

-- Atomic ELO update (floor at 0)
CREATE OR REPLACE FUNCTION update_chess_elo(p_user_id UUID, p_delta INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_elo INTEGER;
BEGIN
  UPDATE profiles
  SET chess_elo = GREATEST(0, chess_elo + p_delta)
  WHERE id = p_user_id
  RETURNING chess_elo INTO new_elo;
  RETURN COALESCE(new_elo, 1000);
END;
$$;

GRANT EXECUTE ON FUNCTION update_chess_elo TO authenticated;

-- Atomic draughts win counter
CREATE OR REPLACE FUNCTION update_draughts_win(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET draughts_wins = draughts_wins + 1 WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_draughts_win TO authenticated;
