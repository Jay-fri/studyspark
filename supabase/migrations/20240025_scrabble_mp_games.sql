-- Multiplayer Scrabble: full game state stored as JSONB for efficient sync
CREATE TABLE IF NOT EXISTS public.scrabble_mp_games (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  player_ids uuid[] NOT NULL DEFAULT '{}',
  player_usernames text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'active', 'completed')),
  board jsonb NOT NULL DEFAULT '[]',
  racks jsonb NOT NULL DEFAULT '{}',
  tile_bag jsonb NOT NULL DEFAULT '[]',
  scores jsonb NOT NULL DEFAULT '{}',
  move_history jsonb NOT NULL DEFAULT '[]',
  current_player_idx integer NOT NULL DEFAULT 0,
  turn_number integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.scrabble_mp_games ENABLE ROW LEVEL SECURITY;

-- Players can read/write their own games
CREATE POLICY "scrabble mp participants" ON public.scrabble_mp_games
  FOR ALL USING (auth.uid() = ANY(player_ids));

ALTER TABLE public.scrabble_mp_games REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scrabble_mp_games;
