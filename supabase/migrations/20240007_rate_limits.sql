-- Groq rate-limit tracking: one row per (user, minute bucket)
CREATE TABLE IF NOT EXISTS groq_rate_limits (
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket      TIMESTAMPTZ NOT NULL,
  req_count   INTEGER     NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, bucket)
);

ALTER TABLE groq_rate_limits ENABLE ROW LEVEL SECURITY;

-- Users can read their own limits (for potential UI display)
CREATE POLICY "own_rate_limits" ON groq_rate_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Atomically increment the counter for the current minute bucket.
-- Returns TRUE if the request is allowed (count <= p_max), FALSE if rate-limited.
CREATE OR REPLACE FUNCTION check_groq_rate_limit(
  p_user_id UUID,
  p_max     INTEGER DEFAULT 10
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bucket TIMESTAMPTZ := date_trunc('minute', NOW() AT TIME ZONE 'UTC');
  v_count  INTEGER;
BEGIN
  INSERT INTO groq_rate_limits (user_id, bucket, req_count)
  VALUES (p_user_id, v_bucket, 1)
  ON CONFLICT (user_id, bucket)
    DO UPDATE SET req_count = groq_rate_limits.req_count + 1
  RETURNING req_count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;

-- Automatically delete buckets older than 2 minutes (keeps the table tiny)
CREATE OR REPLACE FUNCTION prune_groq_rate_limits()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM groq_rate_limits
  WHERE bucket < date_trunc('minute', NOW() AT TIME ZONE 'UTC') - INTERVAL '2 minutes';
$$;
