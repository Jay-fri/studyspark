-- App-wide settings store (token costs, feature flags, etc.)
CREATE TABLE IF NOT EXISTS app_settings (
  id         TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read settings (needed to load live token costs)
CREATE POLICY "Authenticated users can read app settings"
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert or update
CREATE POLICY "Admins can write app settings"
  ON app_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Seed default token costs
INSERT INTO app_settings (id, value)
VALUES (
  'token_costs',
  '{"summary":35,"quiz":40,"flashcards":35,"mindmap":50,"studyguide":60,"keyconcepts":25,"podcast":65,"chat":8}'::jsonb
)
ON CONFLICT (id) DO NOTHING;
