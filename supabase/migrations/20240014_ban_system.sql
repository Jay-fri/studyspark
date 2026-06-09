-- Add ban fields to profiles
alter table profiles
  add column if not exists is_banned   boolean     not null default false,
  add column if not exists ban_reason  text;

-- Ban appeals table
create table if not exists ban_appeals (
  id           uuid        default uuid_generate_v4() primary key,
  user_id      uuid        not null references profiles(id) on delete cascade,
  message      text        not null,
  status       text        not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed')),
  admin_reply  text,
  created_at   timestamptz not null default now()
);

alter table ban_appeals enable row level security;

-- Anyone can insert an appeal for a banned user_id (user is signed out at this point)
create policy "banned user can appeal"
  on ban_appeals for insert
  with check (
    exists (select 1 from profiles where id = user_id and is_banned = true)
  );

-- Authenticated users can read their own appeals
create policy "user reads own appeals"
  on ban_appeals for select
  using (auth.uid() = user_id);

-- Admins can read + update all appeals
create policy "admin reads all appeals"
  on ban_appeals for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "admin updates appeals"
  on ban_appeals for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
