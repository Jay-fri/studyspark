-- ─── credit_tokens ───────────────────────────────────────────────────────────
--  Idempotent: safe to call multiple times with the same flw_ref.
--  Checks token_transactions for existing purchase with that ref before
--  crediting, so a duplicate callback / retry can never double-credit.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function credit_tokens(
  p_user_id     uuid,
  p_amount      integer,
  p_description text,
  p_flw_ref     text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance integer;
begin
  -- Idempotency guard: if this flw_ref was already credited, return current balance
  if exists (
    select 1
      from token_transactions
     where user_id        = p_user_id
       and flutterwave_ref = p_flw_ref
  ) then
    select study_tokens into new_balance from profiles where id = p_user_id;
    return new_balance;
  end if;

  -- Lock row to prevent races
  select study_tokens into new_balance
    from profiles
   where id = p_user_id
     for update;

  if new_balance is null then
    raise exception 'User profile not found';
  end if;

  new_balance := new_balance + p_amount;

  update profiles
     set study_tokens = new_balance,
         updated_at   = now()
   where id = p_user_id;

  insert into token_transactions
    (user_id, type, amount, description, flutterwave_ref, balance_after)
  values
    (p_user_id, 'purchase', p_amount, p_description, p_flw_ref, new_balance);

  return new_balance;
end;
$$;
