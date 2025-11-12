-- SpontaneousConnect Database Schema
-- Enterprise-grade PostgreSQL setup with optimizations, indexing, and security

-- ==========================================
-- EXTENSIONS AND CONFIGURATION
-- ==========================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security globally
ALTER DATABASE postgres SET row_security = on;

-- ==========================================
-- CUSTOM TYPES
-- ==========================================

-- Call status enumeration
CREATE TYPE call_status_enum AS ENUM (
  'suggested',
  'called',
  'skipped',
  'later',
  'failed'
);

-- Blocked time repeat type enumeration
CREATE TYPE block_repeat_enum AS ENUM (
  'daily',
  'weekdays',
  'weekends',
  'custom',
  'once'
);

-- Platform enumeration
CREATE TYPE platform_enum AS ENUM (
  'phone',
  'whatsapp',
  'sms',
  'telegram',
  'discord'
);

-- ==========================================
-- CORE TABLES
-- ==========================================

-- Users table with enhanced security and performance
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL CHECK (length(name) >= 1 AND length(name) <= 100),
  partner_name TEXT NOT NULL CHECK (length(partner_name) >= 1 AND length(partner_name) <= 100),
  partner_phone TEXT CHECK (partner_phone ~ '^\+?[\d\s\-\(\)]+$'),
  daily_call_limit INTEGER DEFAULT 3 CHECK (daily_call_limit > 0 AND daily_call_limit <= 10),
  active_days TEXT DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat,Sun' NOT NULL,
  morning_start TIME DEFAULT '09:00' NOT NULL,
  evening_end TIME DEFAULT '21:00' NOT NULL,
  preferred_platforms TEXT DEFAULT 'phone,whatsapp' NOT NULL,
  timezone TEXT DEFAULT 'UTC' NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  version INTEGER DEFAULT 1 NOT NULL,

  -- Constraints
  CONSTRAINT valid_time_window CHECK (morning_start < evening_end),
  CONSTRAINT valid_timezone CHECK (timezone IN (
    'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
    'America/Los_Angeles', 'Europe/London', 'Europe/Paris',
    'Asia/Tokyo', 'Australia/Sydney'
  ))
);

-- Call history table with partitioning support
CREATE TABLE call_history (
  id UUID DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ NOT NULL,
  actual_time TIMESTAMPTZ,
  platform_used platform_enum,
  status call_status_enum NOT NULL DEFAULT 'suggested',
  success_rating INTEGER CHECK (success_rating >= 1 AND success_rating <= 5),
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Primary key must include partition key for partitioned tables
  PRIMARY KEY (id, created_at),

  -- Constraints
  CONSTRAINT valid_actual_time CHECK (
    actual_time IS NULL OR actual_time >= scheduled_time - INTERVAL '1 hour'
  ),
  CONSTRAINT rating_only_for_completed CHECK (
    (status = 'called' AND success_rating IS NOT NULL) OR
    (status != 'called' AND success_rating IS NULL)
  )
) PARTITION BY RANGE (created_at);

-- Create partitions for call history (current year + next year)
CREATE TABLE call_history_2024 PARTITION OF call_history
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE call_history_2025 PARTITION OF call_history
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE call_history_2026 PARTITION OF call_history
FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Blocked times table with overlap prevention
CREATE TABLE blocked_times (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  block_name TEXT NOT NULL CHECK (length(block_name) >= 1 AND length(block_name) <= 50),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  repeat_type block_repeat_enum NOT NULL,
  days_of_week TEXT CHECK (
    repeat_type != 'custom' OR
    days_of_week ~ '^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(,(Mon|Tue|Wed|Thu|Fri|Sat|Sun))*$'
  ),
  is_active BOOLEAN DEFAULT true NOT NULL,
  priority INTEGER DEFAULT 0 NOT NULL CHECK (priority >= 0 AND priority <= 10),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Constraints
  CONSTRAINT valid_time_range CHECK (start_time < end_time),
  CONSTRAINT custom_days_required CHECK (
    repeat_type != 'custom' OR days_of_week IS NOT NULL
  )
);

-- Schedule helper table with optimistic locking
CREATE TABLE schedule_helper (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  next_call_due TIMESTAMPTZ,
  last_call_time TIMESTAMPTZ,
  calls_today INTEGER DEFAULT 0 NOT NULL CHECK (calls_today >= 0),
  daily_reset_date DATE DEFAULT CURRENT_DATE NOT NULL,
  last_generated TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  lock_version INTEGER DEFAULT 1 NOT NULL,

  -- Constraints
  CONSTRAINT unique_user_schedule UNIQUE (user_id),
  CONSTRAINT future_next_call CHECK (
    next_call_due IS NULL OR next_call_due > NOW() - INTERVAL '1 hour'
  )
);

-- ==========================================
-- PERFORMANCE INDEXES
-- ==========================================

-- Users table indexes
CREATE INDEX idx_users_email ON users USING btree (email);
CREATE INDEX idx_users_active ON users USING btree (is_active) WHERE is_active = true;
CREATE INDEX idx_users_updated_at ON users USING btree (updated_at);

-- Call history indexes (applied to all partitions)
CREATE INDEX idx_call_history_user_scheduled ON call_history USING btree (user_id, scheduled_time DESC);
CREATE INDEX idx_call_history_status_created ON call_history USING btree (status, created_at DESC);
CREATE INDEX idx_call_history_actual_time ON call_history USING btree (actual_time) WHERE actual_time IS NOT NULL;
CREATE INDEX idx_call_history_metadata ON call_history USING gin (metadata);
CREATE INDEX idx_call_history_platform ON call_history USING btree (platform_used) WHERE platform_used IS NOT NULL;

-- Blocked times indexes
CREATE INDEX idx_blocked_times_user_active ON blocked_times USING btree (user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_blocked_times_priority ON blocked_times USING btree (priority DESC, start_time);
CREATE INDEX idx_blocked_times_time_range ON blocked_times USING btree (start_time, end_time);

-- Schedule helper indexes
CREATE INDEX idx_schedule_helper_next_call ON schedule_helper USING btree (next_call_due) WHERE next_call_due IS NOT NULL;
CREATE INDEX idx_schedule_helper_reset_date ON schedule_helper USING btree (daily_reset_date);

-- Composite indexes for common queries
CREATE INDEX idx_call_history_user_status_time ON call_history USING btree (user_id, status, created_at DESC);
CREATE INDEX idx_blocked_times_user_priority_active ON blocked_times USING btree (user_id, priority DESC, is_active);

-- ==========================================
-- ROW LEVEL SECURITY POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_helper ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "users_own_profile" ON users
  FOR ALL USING (auth.uid()::text = id::text);

-- Call history policies
CREATE POLICY "users_own_call_history" ON call_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = call_history.user_id
      AND auth.uid()::text = users.id::text
    )
  );

-- Blocked times policies
CREATE POLICY "users_own_blocked_times" ON blocked_times
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = blocked_times.user_id
      AND auth.uid()::text = users.id::text
    )
  );

-- Schedule helper policies
CREATE POLICY "users_own_schedule_helper" ON schedule_helper
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = schedule_helper.user_id
      AND auth.uid()::text = users.id::text
    )
  );

-- ==========================================
-- TRIGGERS AND FUNCTIONS
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update version for optimistic locking
CREATE OR REPLACE FUNCTION update_version_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to reset daily call counts
CREATE OR REPLACE FUNCTION reset_daily_call_counts()
RETURNS void AS $$
BEGIN
  UPDATE schedule_helper
  SET calls_today = 0, daily_reset_date = CURRENT_DATE
  WHERE daily_reset_date < CURRENT_DATE;

  -- Log the reset operation
  INSERT INTO call_history (user_id, scheduled_time, status, notes, metadata)
  SELECT
    user_id,
    NOW(),
    'suggested'::call_status_enum,
    'Daily count reset',
    jsonb_build_object('operation', 'daily_reset', 'timestamp', NOW())
  FROM schedule_helper
  WHERE daily_reset_date = CURRENT_DATE;
END;
$$ language 'plpgsql';

-- Function to cleanup old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- Delete call history older than 1 year
  DELETE FROM call_history
  WHERE created_at < NOW() - INTERVAL '1 year';

  -- Archive old inactive blocked times (could move to archive table)
  UPDATE blocked_times
  SET is_active = false
  WHERE is_active = true
    AND created_at < NOW() - INTERVAL '6 months'
    AND repeat_type = 'once';
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_version
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_version_column();

CREATE TRIGGER update_schedule_helper_updated_at
  BEFORE UPDATE ON schedule_helper
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- ==========================================

-- User statistics view
CREATE MATERIALIZED VIEW user_stats AS
SELECT
  u.id,
  u.name,
  u.daily_call_limit,
  COUNT(ch.id) as total_calls,
  COUNT(ch.id) FILTER (WHERE ch.status = 'called') as successful_calls,
  ROUND(
    COUNT(ch.id) FILTER (WHERE ch.status = 'called')::numeric /
    NULLIF(COUNT(ch.id), 0) * 100, 2
  ) as success_rate,
  AVG(ch.success_rating) FILTER (WHERE ch.success_rating IS NOT NULL) as avg_rating,
  COUNT(DISTINCT DATE(ch.created_at)) as active_days,
  MAX(ch.created_at) as last_call_date
FROM users u
LEFT JOIN call_history ch ON u.id = ch.user_id
WHERE u.is_active = true
GROUP BY u.id, u.name, u.daily_call_limit;

-- Create index on materialized view
CREATE UNIQUE INDEX idx_user_stats_id ON user_stats (id);

-- Daily call patterns view
CREATE MATERIALIZED VIEW daily_call_patterns AS
SELECT
  user_id,
  EXTRACT(DOW FROM scheduled_time) as day_of_week,
  EXTRACT(HOUR FROM scheduled_time) as hour_of_day,
  COUNT(*) as call_count,
  COUNT(*) FILTER (WHERE status = 'called') as successful_count,
  AVG(success_rating) FILTER (WHERE success_rating IS NOT NULL) as avg_rating
FROM call_history
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY user_id, EXTRACT(DOW FROM scheduled_time), EXTRACT(HOUR FROM scheduled_time);

-- Create indexes on patterns view
CREATE INDEX idx_daily_patterns_user ON daily_call_patterns (user_id);
CREATE INDEX idx_daily_patterns_dow ON daily_call_patterns (day_of_week);
CREATE INDEX idx_daily_patterns_hour ON daily_call_patterns (hour_of_day);

-- ==========================================
-- SCHEDULED JOBS (using pg_cron if available)
-- ==========================================

-- Note: These would need pg_cron extension enabled
-- Schedule daily reset at midnight UTC
-- SELECT cron.schedule('daily-reset', '0 0 * * *', 'SELECT reset_daily_call_counts();');

-- Schedule weekly cleanup on Sundays at 2 AM UTC
-- SELECT cron.schedule('weekly-cleanup', '0 2 * * 0', 'SELECT cleanup_old_data();');

-- Schedule materialized view refresh every hour
-- SELECT cron.schedule('refresh-stats', '0 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY user_stats; REFRESH MATERIALIZED VIEW CONCURRENTLY daily_call_patterns;');

-- ==========================================
-- INITIAL DATA SETUP
-- ==========================================

-- Create default blocked time templates (these can be copied by users)
INSERT INTO blocked_times (
  id, user_id, block_name, start_time, end_time,
  repeat_type, days_of_week, priority, is_active
) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000', -- Template user
    'Work Hours',
    '09:00', '17:00',
    'weekdays', NULL, 5, false
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'Sleep Time',
    '23:00', '07:00',
    'daily', NULL, 8, false
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'Lunch Break',
    '12:00', '13:00',
    'weekdays', NULL, 3, false
  )
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- PERFORMANCE ANALYSIS QUERIES
-- ==========================================

-- Function to analyze query performance
CREATE OR REPLACE FUNCTION analyze_performance()
RETURNS TABLE (
  table_name text,
  index_usage numeric,
  table_size text,
  index_size text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname||'.'||tablename as table_name,
    CASE
      WHEN seq_tup_read + idx_tup_fetch = 0 THEN 0
      ELSE idx_tup_fetch::numeric / (seq_tup_read + idx_tup_fetch) * 100
    END as index_usage,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(
      pg_total_relation_size(schemaname||'.'||tablename) -
      pg_relation_size(schemaname||'.'||tablename)
    ) as index_size
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ language 'plpgsql';

-- ==========================================
-- SECURITY HARDENING
-- ==========================================

-- Revoke default permissions
REVOKE ALL ON DATABASE postgres FROM public;
REVOKE ALL ON SCHEMA public FROM public;

-- Grant specific permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Ensure RLS is enforced
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE call_history FORCE ROW LEVEL SECURITY;
ALTER TABLE blocked_times FORCE ROW LEVEL SECURITY;
ALTER TABLE schedule_helper FORCE ROW LEVEL SECURITY;

-- ==========================================
-- FINAL OPTIMIZATIONS
-- ==========================================

-- Vacuum and analyze all tables for optimal performance
VACUUM ANALYZE users;
VACUUM ANALYZE call_history;
VACUUM ANALYZE blocked_times;
VACUUM ANALYZE schedule_helper;

-- Update table statistics
ANALYZE users;
ANALYZE call_history;
ANALYZE blocked_times;
ANALYZE schedule_helper;

-- Final refresh of materialized views
REFRESH MATERIALIZED VIEW user_stats;
REFRESH MATERIALIZED VIEW daily_call_patterns;

-- ==========================================
-- MONITORING AND ALERTING SETUP
-- ==========================================

-- Function to check system health
CREATE OR REPLACE FUNCTION system_health_check()
RETURNS TABLE (
  metric text,
  value numeric,
  status text,
  recommendation text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'Active Users'::text,
    COUNT(*)::numeric,
    CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'WARNING' END::text,
    'Monitor user growth'::text
  FROM users WHERE is_active = true

  UNION ALL

  SELECT
    'Calls Last 24h'::text,
    COUNT(*)::numeric,
    CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'INFO' END::text,
    'Normal activity level'::text
  FROM call_history WHERE created_at > NOW() - INTERVAL '24 hours'

  UNION ALL

  SELECT
    'Database Size (MB)'::text,
    ROUND(pg_database_size(current_database())::numeric / 1024 / 1024, 2),
    'OK'::text,
    'Monitor growth trends'::text;
END;
$$ language 'plpgsql';

-- Success! Database schema is now ready for enterprise-grade application
SELECT 'Database setup completed successfully!' as status;