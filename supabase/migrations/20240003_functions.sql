-- ============================================================
--  StudyLM — Database Functions & Triggers
-- ============================================================

-- ─── handle_new_user ──────────────────────────────────────────────────────
--  Automatically creates a profile row and logs the welcome token grant
--  whenever a new user signs up through Supabase Auth.
-- ──────────────────────────────────────────────────────────────────────────

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, study_tokens)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    1000
  );

  insert into public.token_transactions
    (user_id, type, amount, description, balance_after)
  values
    (new.id, 'grant', 1000, 'Welcome bonus tokens', 1000);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ─── deduct_tokens ────────────────────────────────────────────────────────
--  Atomically deducts tokens from a user's balance and logs the transaction.
--  Raises an exception if the user cannot afford it.
--  Returns the new balance.
-- ──────────────────────────────────────────────────────────────────────────

create or replace function deduct_tokens(
  p_user_id     uuid,
  p_amount      integer,
  p_description text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance integer;
  new_balance     integer;
begin
  -- Lock the row so concurrent calls don't race
  select study_tokens
    into current_balance
    from profiles
   where id = p_user_id
     for update;

  if current_balance is null then
    raise exception 'User profile not found';
  end if;

  if current_balance < p_amount then
    raise exception 'Insufficient tokens: need %, have %', p_amount, current_balance;
  end if;

  new_balance := current_balance - p_amount;

  update profiles
     set study_tokens      = new_balance,
         total_tokens_used = total_tokens_used + p_amount,
         updated_at        = now()
   where id = p_user_id;

  insert into token_transactions
    (user_id, type, amount, description, balance_after)
  values
    (p_user_id, 'spend', p_amount, p_description, new_balance);

  return new_balance;
end;
$$;


-- ─── add_tokens ───────────────────────────────────────────────────────────
--  Adds tokens to a user's balance (used after a successful payment).
--  Returns the new balance.
-- ──────────────────────────────────────────────────────────────────────────

create or replace function add_tokens(
  p_user_id     uuid,
  p_amount      integer,
  p_description text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance integer;
begin
  update profiles
     set study_tokens = study_tokens + p_amount,
         updated_at   = now()
   where id = p_user_id
  returning study_tokens into new_balance;

  if new_balance is null then
    raise exception 'User profile not found';
  end if;

  insert into token_transactions
    (user_id, type, amount, description, balance_after)
  values
    (p_user_id, 'purchase', p_amount, p_description, new_balance);

  return new_balance;
end;
$$;


-- ─── admin_grant_tokens ───────────────────────────────────────────────────
--  Admin-only: grant tokens to any user (e.g. for support/compensation).
-- ──────────────────────────────────────────────────────────────────────────

create or replace function admin_grant_tokens(
  p_admin_id    uuid,
  p_user_id     uuid,
  p_amount      integer,
  p_description text default 'Admin token grant'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_role  text;
  new_balance integer;
begin
  select role into admin_role from profiles where id = p_admin_id;

  if admin_role <> 'admin' then
    raise exception 'Forbidden: caller is not an admin';
  end if;

  update profiles
     set study_tokens = study_tokens + p_amount,
         updated_at   = now()
   where id = p_user_id
  returning study_tokens into new_balance;

  insert into token_transactions
    (user_id, type, amount, description, balance_after)
  values
    (p_user_id, 'admin_grant', p_amount, p_description, new_balance);

  return new_balance;
end;
$$;
