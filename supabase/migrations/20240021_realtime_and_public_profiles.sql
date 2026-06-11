-- Allow any authenticated user to read basic public profile info
-- (needed for showing usernames/ELO in challenges, friend requests, game boards)
CREATE POLICY "Authenticated users can view public profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Enable full row replication so Realtime filter subscriptions work on
-- non-primary-key columns (player2_id, addressee_id, etc.)
ALTER TABLE public.chess_games REPLICA IDENTITY FULL;
ALTER TABLE public.friendships REPLICA IDENTITY FULL;

-- Add tables to the Realtime publication
-- (these were commented out in earlier migrations)
ALTER PUBLICATION supabase_realtime ADD TABLE public.chess_games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
