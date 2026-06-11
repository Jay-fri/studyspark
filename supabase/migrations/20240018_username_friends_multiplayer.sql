-- ─────────────────────────────────────────────────────────────────────────────
-- Username on profiles
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists username text unique;

-- Index for fast username search
create index if not exists profiles_username_idx on public.profiles (lower(username));

-- ─────────────────────────────────────────────────────────────────────────────
-- Friendships
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.friendships (
  id           uuid default gen_random_uuid() primary key,
  requester_id uuid references public.profiles(id) on delete cascade,
  addressee_id uuid references public.profiles(id) on delete cascade,
  status       text default 'pending'
               check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique(requester_id, addressee_id)
);

alter table public.friendships enable row level security;

-- Each user can see friendships they're a party to
create policy "see own friendships" on public.friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Only requester can insert
create policy "insert friendship" on public.friendships
  for insert with check (auth.uid() = requester_id);

-- Only addressee can update (accept / decline)
create policy "update friendship" on public.friendships
  for update using (auth.uid() = addressee_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Extend chess_games for multiplayer
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.chess_games
  add column if not exists player2_id    uuid references public.profiles(id),
  add column if not exists game_type     text default 'ai'
                                         check (game_type in ('ai', 'multiplayer')),
  add column if not exists player1_color text default 'white'
                                         check (player1_color in ('white', 'black'));

-- Replace old single-owner RLS policy with participant-based one
drop policy if exists "own chess" on public.chess_games;

create policy "chess participants" on public.chess_games
  for all using (
    auth.uid() = user_id
    or auth.uid() = player2_id
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Enable Realtime on chess_games (run this in Supabase dashboard too if needed)
-- ─────────────────────────────────────────────────────────────────────────────
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.chess_games;
-- (uncomment above and run separately if realtime isn't already enabled for this table)

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: search_users_by_username — returns profiles matching a username prefix
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.search_users_by_username(
  p_query    text,
  p_user_id  uuid,
  p_limit    int default 10
) returns table (
  id         uuid,
  username   text,
  full_name  text,
  avatar_url text
) as $$
  select p.id, p.username, p.full_name, p.avatar_url
  from public.profiles p
  where p.id <> p_user_id
    and p.username is not null
    and lower(p.username) like lower(p_query) || '%'
  order by p.username
  limit p_limit;
$$ language sql stable security definer;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: get_friends — returns accepted friends with basic profile info
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_friends(p_user_id uuid)
returns table (
  friendship_id uuid,
  friend_id     uuid,
  username      text,
  full_name     text,
  avatar_url    text,
  requester_id  uuid
) as $$
  select
    f.id as friendship_id,
    case when f.requester_id = p_user_id then f.addressee_id else f.requester_id end as friend_id,
    p.username,
    p.full_name,
    p.avatar_url,
    f.requester_id
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = p_user_id then f.addressee_id else f.requester_id end
  where (f.requester_id = p_user_id or f.addressee_id = p_user_id)
    and f.status = 'accepted';
$$ language sql stable security definer;
