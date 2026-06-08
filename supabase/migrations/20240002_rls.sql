-- ============================================================
--  StudyLM — Row Level Security Policies
-- ============================================================

alter table profiles           enable row level security;
alter table notebooks          enable row level security;
alter table sources            enable row level security;
alter table ai_outputs         enable row level security;
alter table chat_messages      enable row level security;
alter table token_transactions enable row level security;
alter table payments           enable row level security;

-- profiles
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- is_admin() uses SECURITY DEFINER so the inner profiles query bypasses RLS,
-- preventing the infinite recursion that a direct subquery would cause.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create policy "Admins can view all profiles"
  on profiles for select
  using (public.is_admin());

-- notebooks
create policy "Users manage own notebooks"
  on notebooks for all using (auth.uid() = user_id);

-- sources
create policy "Users manage own sources"
  on sources for all using (auth.uid() = user_id);

-- ai_outputs
create policy "Users manage own ai_outputs"
  on ai_outputs for all using (auth.uid() = user_id);

-- chat_messages
create policy "Users manage own messages"
  on chat_messages for all using (auth.uid() = user_id);

-- token_transactions (read-only for users)
create policy "Users view own transactions"
  on token_transactions for select using (auth.uid() = user_id);

create policy "Service role inserts transactions"
  on token_transactions for insert
  with check (true);  -- restricted to service role via RPC security definer

-- payments (read-only for users)
create policy "Users view own payments"
  on payments for select using (auth.uid() = user_id);

create policy "Service role inserts payments"
  on payments for insert
  with check (true);
