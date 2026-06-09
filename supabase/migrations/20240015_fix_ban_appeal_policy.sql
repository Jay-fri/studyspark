-- Drop the existing insert policy and replace it with one that
-- requires the authenticated user to be the owner AND be banned.
drop policy if exists "banned user can appeal" on ban_appeals;

create policy "banned user can appeal"
  on ban_appeals for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from profiles where id = auth.uid() and is_banned = true)
  );
