-- User-specific notifications (native push + in-app dropdown)
create table if not exists public.notifications (
  id               uuid        default gen_random_uuid() primary key,
  user_id          uuid        references public.profiles(id) on delete cascade,
  title            text        not null,
  body             text        not null,
  type             text        not null check (type in (
                     'token_granted', 'payment_success',
                     'generation_complete', 'streak_reminder',
                     'flashcard_due', 'admin_message'
                   )),
  metadata         jsonb,
  is_read          boolean     default false,
  delivered_native boolean     default false,
  created_at       timestamptz default now()
);

alter table public.notifications enable row level security;

create policy "own notifications"
  on public.notifications for all
  using (auth.uid() = user_id);

-- FCM device tokens — one row per user/device pair
create table if not exists public.device_tokens (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references public.profiles(id) on delete cascade,
  push_token  text        not null,
  platform    text        default 'android',
  created_at  timestamptz default now(),
  unique (user_id, push_token)
);

alter table public.device_tokens enable row level security;

create policy "own device tokens"
  on public.device_tokens for all
  using (auth.uid() = user_id);

-- Realtime so the in-app dropdown updates instantly on new inserts
alter publication supabase_realtime add table public.notifications;
