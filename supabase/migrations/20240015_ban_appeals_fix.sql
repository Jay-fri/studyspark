-- Add admin_reply to ban_appeals if not exists
alter table ban_appeals add column if not exists admin_reply text;

-- Drop old policies and recreate with correct rules
drop policy if exists "banned user can appeal"      on ban_appeals;
drop policy if exists "banned user reads own appeals" on ban_appeals;
drop policy if exists "user reads own appeals"       on ban_appeals;
drop policy if exists "admin reads all appeals"      on ban_appeals;
drop policy if exists "admin updates appeals"        on ban_appeals;

-- Anyone (even signed-out) can insert an appeal for a banned user_id
create policy "banned user can appeal"
  on ban_appeals for insert
  with check (
    exists (select 1 from profiles where id = user_id and is_banned = true)
  );

-- Authenticated users can read their own appeals
create policy "user reads own appeals"
  on ban_appeals for select
  using (auth.uid() = user_id);

-- Admins can read all appeals
create policy "admin reads all appeals"
  on ban_appeals for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Admins can update (status + admin_reply)
create policy "admin updates appeals"
  on ban_appeals for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
