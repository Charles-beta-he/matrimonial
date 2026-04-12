-- Analytics events table (append-only, time-series pattern)
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event TEXT NOT NULL,
  props JSONB DEFAULT '{}',
  user_id TEXT,
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events (event);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events (created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events (session_id);

-- Partition by month for scale (optional, add when data grows)
-- CREATE TABLE analytics_events_2026_04 PARTITION OF analytics_events FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
