-- ─── Re-engagement log ───────────────────────────────────────────────────────

create table if not exists public.reengagement_log (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references public.profiles(id) on delete cascade,
  tier       integer     not null check (tier in (1, 2, 3)),
  sent_at    timestamptz default now()
);

alter table public.reengagement_log enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'reengagement_log' and policyname = 'service role only'
  ) then
    create policy "service role only"
      on public.reengagement_log for all using (false);
  end if;
end $$;

create index if not exists reengagement_log_user_tier_idx
  on public.reengagement_log (user_id, tier, sent_at);

-- ─── RPC: find users inactive for at least p_days ────────────────────────────

create or replace function get_inactive_users(p_days integer)
returns table(
  user_id          uuid,
  full_name        text,
  study_tokens     integer,
  current_streak   integer,
  last_active_date date
) as $$
begin
  return query
  select
    p.id,
    p.full_name,
    p.study_tokens,
    coalesce(s.current_streak, 0),
    s.last_active_date
  from profiles p
  left join streaks s on s.user_id = p.id
  where p.role != 'admin'
    and (
      s.last_active_date is null
      or s.last_active_date <= current_date - p_days
    )
    and not exists (
      select 1 from reengagement_log r
      where r.user_id = p.id
        and r.tier = (
          case
            when p_days = 3  then 1
            when p_days = 7  then 2
            when p_days = 14 then 3
          end
        )
        and r.sent_at > now() - interval '21 days'
    );
end;
$$ language plpgsql security definer;

-- ─── pg_cron schedule ─────────────────────────────────────────────────────────
-- Run this block MANUALLY in the Supabase SQL editor after:
--   1. Enabling pg_cron and pg_net extensions in Dashboard → Database → Extensions
--   2. Replacing YOUR_CRON_SECRET_HERE with your actual CRON_SECRET value
--
-- Do NOT commit the secret value into this file.
--
-- select cron.schedule(
--   'daily-reengagement-check',
--   '0 10 * * *',
--   $$
--   select net.http_post(
--     url     := 'https://yguqquyvuflcmlhwdzal.supabase.co/functions/v1/send-reengagement',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer YOUR_CRON_SECRET_HERE',
--       'Content-Type',  'application/json'
--     ),
--     body    := '{}'::jsonb
--   );
--   $$
-- );
