-- Multiplayer Draughts
CREATE TABLE IF NOT EXISTS public.draughts_games (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player1_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  player2_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  p1_username text,
  p2_username text,
  board jsonb NOT NULL DEFAULT '[]',
  current_player text NOT NULL DEFAULT 'player1' CHECK (current_player IN ('player1', 'player2')),
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'declined')),
  winner text CHECK (winner IN ('player1', 'player2')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.draughts_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "draughts participants" ON public.draughts_games
  FOR ALL USING (auth.uid() = player1_id OR auth.uid() = player2_id);

ALTER TABLE public.draughts_games REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.draughts_games;
