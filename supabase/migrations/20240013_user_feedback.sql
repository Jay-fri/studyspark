-- User feedback & improvement suggestions table

CREATE TABLE IF NOT EXISTS user_feedback (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category    TEXT        NOT NULL CHECK (category IN ('bug', 'feature', 'general', 'other')),
  message     TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "users_insert_own_feedback"
  ON user_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "users_view_own_feedback"
  ON user_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "admins_view_all_feedback"
  ON user_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update status
CREATE POLICY "admins_update_feedback_status"
  ON user_feedback FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Index for admin queries
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status     ON user_feedback (status);
