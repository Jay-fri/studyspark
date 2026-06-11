CREATE TABLE IF NOT EXISTS public.ttt_games (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  player_x_id  uuid        REFERENCES public.profiles(id) ON DELETE CASCADE,
  player_o_id  uuid        REFERENCES public.profiles(id) ON DELETE CASCADE,
  board        text[]      NOT NULL DEFAULT ARRAY['','','','','','','','',''],
  current_player text      NOT NULL DEFAULT 'X',
  winner       text,  -- 'X', 'O', 'draw', null
  status       text        NOT NULL DEFAULT 'waiting'
               CHECK (status IN ('waiting','active','completed','declined')),
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE public.ttt_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ttt participants" ON public.ttt_games
  FOR ALL USING (
    auth.uid() = player_x_id OR auth.uid() = player_o_id
  );

ALTER TABLE public.ttt_games REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ttt_games;
