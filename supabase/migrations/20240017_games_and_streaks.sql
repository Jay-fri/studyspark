-- ─────────────────────────────────────────────────────────────────────────────
-- Chess games
-- ─────────────────────────────────────────────────────────────────────────────
create table public.chess_games (
  id               uuid        default gen_random_uuid() primary key,
  user_id          uuid        references public.profiles(id) on delete cascade,
  pgn              text        not null default '',
  fen              text        not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  status           text        default 'active'
                               check (status in ('active','completed','abandoned')),
  result           text        check (result in ('win','loss','draw',null)),
  game_over_reason text,
  difficulty       text        default 'easy'
                               check (difficulty in ('easy','medium','hard')),
  time_control     text        default 'unlimited',
  moves_count      integer     default 0,
  ai_review        jsonb,
  ai_reviewed_at   timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Scrabble games
-- ─────────────────────────────────────────────────────────────────────────────
create table public.scrabble_games (
  id           uuid        default gen_random_uuid() primary key,
  user_id      uuid        references public.profiles(id) on delete cascade,
  game_state   jsonb       not null default '{}',
  score        integer     default 0,
  words_played integer     default 0,
  status       text        default 'active'
               check (status in ('active','completed')),
  ai_review      jsonb,
  ai_reviewed_at timestamptz,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Streaks
-- ─────────────────────────────────────────────────────────────────────────────
create table public.streaks (
  id                uuid  default gen_random_uuid() primary key,
  user_id           uuid  references public.profiles(id) on delete cascade unique,
  current_streak    integer default 0,
  longest_streak    integer default 0,
  last_active_date  date,
  total_active_days integer default 0,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Daily activity log
-- ─────────────────────────────────────────────────────────────────────────────
create table public.daily_activity (
  id            uuid        default gen_random_uuid() primary key,
  user_id       uuid        references public.profiles(id) on delete cascade,
  activity_date date        not null default current_date,
  activity_type text        not null,
  metadata      jsonb,
  created_at    timestamptz default now(),
  unique(user_id, activity_date, activity_type)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-level security
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.chess_games    enable row level security;
alter table public.scrabble_games enable row level security;
alter table public.streaks        enable row level security;
alter table public.daily_activity enable row level security;

create policy "own chess"    on public.chess_games    for all using (auth.uid() = user_id);
create policy "own scrabble" on public.scrabble_games for all using (auth.uid() = user_id);
create policy "own streak"   on public.streaks        for all using (auth.uid() = user_id);
create policy "own activity" on public.daily_activity for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-create a streak row whenever a new profile is inserted
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_streak()
returns trigger as $$
begin
  insert into public.streaks (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Only add the trigger if it doesn't already exist
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'on_profile_created_streak'
  ) then
    create trigger on_profile_created_streak
      after insert on public.profiles
      for each row execute procedure public.handle_new_streak();
  end if;
end;
$$;

-- Back-fill streaks rows for existing users who don't have one yet
insert into public.streaks (user_id)
select id from public.profiles
where id not in (select user_id from public.streaks)
on conflict (user_id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- RPC: record_activity — atomically logs activity and updates streak
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function record_activity(
  p_user_id      uuid,
  p_activity_type text,
  p_metadata      jsonb default null
) returns jsonb as $$
declare
  v_streak         record;
  v_today          date := current_date;
  v_yesterday      date := current_date - interval '1 day';
  v_already_active boolean := false;
  v_new_streak     integer;
begin
  -- Check if user was already active today (any activity type)
  select exists(
    select 1 from daily_activity
    where user_id = p_user_id
      and activity_date = v_today
  ) into v_already_active;

  -- Insert this activity (silently ignore duplicate type+date)
  insert into daily_activity (user_id, activity_date, activity_type, metadata)
  values (p_user_id, v_today, p_activity_type, p_metadata)
  on conflict (user_id, activity_date, activity_type) do nothing;

  -- Only recalculate streak on the first activity of the day
  if not v_already_active then
    select * into v_streak from streaks where user_id = p_user_id;

    if v_streak is null then
      -- Streak row missing (race condition or old account) — create it
      insert into streaks (user_id, current_streak, longest_streak, last_active_date, total_active_days)
      values (p_user_id, 1, 1, v_today, 1)
      on conflict (user_id) do nothing;

      return jsonb_build_object('streak', 1, 'is_new_day', true);
    end if;

    if v_streak.last_active_date = v_yesterday then
      v_new_streak := v_streak.current_streak + 1;
    elsif v_streak.last_active_date = v_today then
      v_new_streak := v_streak.current_streak;
    else
      v_new_streak := 1;
    end if;

    update streaks set
      current_streak    = v_new_streak,
      longest_streak    = greatest(longest_streak, v_new_streak),
      last_active_date  = v_today,
      total_active_days = total_active_days + 1,
      updated_at        = now()
    where user_id = p_user_id;

    return jsonb_build_object('streak', v_new_streak, 'is_new_day', true);
  end if;

  -- Already active today — just return current streak
  select current_streak into v_new_streak
  from streaks where user_id = p_user_id;

  return jsonb_build_object('streak', coalesce(v_new_streak, 0), 'is_new_day', false);
end;
$$ language plpgsql security definer;
