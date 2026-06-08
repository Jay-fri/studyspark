-- ============================================================
--  StudyLM — Admin Dashboard Schema & Policies
-- ============================================================

-- ─── Extend profiles ──────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── Admin policies for existing tables ───────────────────────────────────────
-- Admins can update any profile (suspend, change role)
CREATE POLICY "admin_update_any_profile" ON public.profiles
  FOR UPDATE USING (public.is_admin());

-- Admins can read all notebooks
CREATE POLICY "admin_read_all_notebooks" ON public.notebooks
  FOR SELECT USING (public.is_admin());

-- Admins can read all ai_outputs
CREATE POLICY "admin_read_all_ai_outputs" ON public.ai_outputs
  FOR SELECT USING (public.is_admin());

-- Admins can read all token_transactions
CREATE POLICY "admin_read_all_transactions" ON public.token_transactions
  FOR SELECT USING (public.is_admin());

-- Admins can update token_transactions (service-side only but adding for completeness)
CREATE POLICY "admin_read_all_payments" ON public.payments
  FOR SELECT USING (public.is_admin());

-- ─── announcements ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcements (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  title       TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── announcement_reads ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, announcement_id)
);

-- ─── RLS for announcements ────────────────────────────────────────────────────
ALTER TABLE public.announcements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active announcements; admins see all
CREATE POLICY "announcements_select" ON public.announcements
  FOR SELECT TO authenticated
  USING (active = TRUE OR public.is_admin());

-- Only admins can create / update / delete
CREATE POLICY "announcements_admin_all" ON public.announcements
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Users manage their own read receipts
CREATE POLICY "reads_own_select" ON public.announcement_reads
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "reads_own_insert" ON public.announcement_reads
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
