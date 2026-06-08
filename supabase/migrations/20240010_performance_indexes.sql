-- Performance indexes for 1000+ concurrent users
-- All created with IF NOT EXISTS so this migration is idempotent

-- notebooks: most queries filter by user_id
CREATE INDEX IF NOT EXISTS idx_notebooks_user_id
  ON notebooks (user_id);

-- sources: notebook page always fetches by notebook_id
CREATE INDEX IF NOT EXISTS idx_sources_notebook_id
  ON sources (notebook_id);

-- sources: upload modal filters by user_id in some admin queries
CREATE INDEX IF NOT EXISTS idx_sources_user_id
  ON sources (user_id);

-- ai_outputs: notebook page fetches by notebook_id; upsert conflict on (notebook_id, type)
CREATE INDEX IF NOT EXISTS idx_ai_outputs_notebook_id
  ON ai_outputs (notebook_id);

CREATE INDEX IF NOT EXISTS idx_ai_outputs_user_id
  ON ai_outputs (user_id);

-- chat_messages: chat panel always fetches by notebook_id ordered by created_at
CREATE INDEX IF NOT EXISTS idx_chat_messages_notebook_id_created_at
  ON chat_messages (notebook_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id
  ON chat_messages (user_id);

-- token_transactions: settings page fetches by user_id ordered by created_at desc
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id_created_at
  ON token_transactions (user_id, created_at DESC);

-- profiles: looked up by id (PK) — already indexed. Add on email for auth lookups if needed.
-- app_settings: tiny table, no index needed.
