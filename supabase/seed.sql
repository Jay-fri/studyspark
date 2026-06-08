-- ============================================================
--  StudyLM — Seed Data (optional, dev/staging only)
--  Creates a test admin user profile.
--  NOTE: The auth.users row must exist first (sign up manually,
--        then paste that user's UUID below).
-- ============================================================

-- Replace with the UUID from auth.users after signing up
do $$
declare
  test_user_id uuid := '00000000-0000-0000-0000-000000000001'; -- ← replace me
begin
  -- Promote to admin
  update profiles set role = 'admin' where id = test_user_id;

  -- Add some extra tokens for testing
  perform add_tokens(test_user_id, 9000, 'Dev seed bonus');
end;
$$;
