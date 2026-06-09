create or replace function public.submit_ban_appeal(p_user_id uuid, p_message text)
returns void
language sql
security definer
set search_path = public
as $$
  update profiles
  set appeal_message = p_message
  where id = p_user_id and is_banned = true;
$$;

grant execute on function public.submit_ban_appeal(uuid, text) to anon, authenticated;
