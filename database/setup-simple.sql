-- SpontaneousConnect Simple Database Setup
-- This is a simplified version that's easier to execute

-- ==========================================
-- STEP 1: EXTENSIONS
-- ==========================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- STEP 2: CUSTOM TYPES
-- ==========================================

-- Call status enumeration
DO $$ BEGIN
    CREATE TYPE call_status_enum AS ENUM (
      'suggested',
      'called',
      'skipped',
      'later',
      'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Blocked time repeat type enumeration
DO $$ BEGIN
    CREATE TYPE block_repeat_enum AS ENUM (
      'daily',
      'weekdays',
      'weekends',
      'custom',
      'once'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Platform enumeration
DO $$ BEGIN
    CREATE TYPE platform_enum AS ENUM (
      'phone',
      'whatsapp',
      'sms',
      'telegram',
      'discord'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==========================================
-- STEP 3: CORE TABLES
-- ==========================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  partner_name TEXT NOT NULL,
  partner_phone TEXT,
  daily_call_limit INTEGER DEFAULT 3,
  active_days TEXT DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat,Sun' NOT NULL,
  morning_start TIME DEFAULT '09:00' NOT NULL,
  evening_end TIME DEFAULT '21:00' NOT NULL,
  preferred_platforms TEXT DEFAULT 'phone,whatsapp' NOT NULL,
  timezone TEXT DEFAULT 'UTC' NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  version INTEGER DEFAULT 1 NOT NULL
);

-- Call history table
CREATE TABLE IF NOT EXISTS call_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMPTZ NOT NULL,
  actual_time TIMESTAMPTZ,
  platform_used platform_enum,
  status call_status_enum NOT NULL DEFAULT 'suggested',
  success_rating INTEGER,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Blocked times table
CREATE TABLE IF NOT EXISTS blocked_times (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  block_name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  repeat_type block_repeat_enum NOT NULL,
  days_of_week TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  priority INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Schedule helper table
CREATE TABLE IF NOT EXISTS schedule_helper (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  next_call_due TIMESTAMPTZ,
  last_call_time TIMESTAMPTZ,
  calls_today INTEGER DEFAULT 0 NOT NULL,
  daily_reset_date DATE DEFAULT CURRENT_DATE NOT NULL,
  last_generated TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  lock_version INTEGER DEFAULT 1 NOT NULL,
  UNIQUE(user_id)
);

-- ==========================================
-- STEP 4: INDEXES
-- ==========================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users (is_active) WHERE is_active = true;

-- Call history indexes
CREATE INDEX IF NOT EXISTS idx_call_history_user_scheduled ON call_history (user_id, scheduled_time DESC);
CREATE INDEX IF NOT EXISTS idx_call_history_status_created ON call_history (status, created_at DESC);

-- Blocked times indexes
CREATE INDEX IF NOT EXISTS idx_blocked_times_user_active ON blocked_times (user_id, is_active) WHERE is_active = true;

-- Schedule helper indexes
CREATE INDEX IF NOT EXISTS idx_schedule_helper_next_call ON schedule_helper (next_call_due) WHERE next_call_due IS NOT NULL;

-- ==========================================
-- STEP 5: ROW LEVEL SECURITY
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_helper ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS "users_own_profile" ON users;
CREATE POLICY "users_own_profile" ON users
  FOR ALL USING (auth.uid()::text = id::text);

-- Call history policies
DROP POLICY IF EXISTS "users_own_call_history" ON call_history;
CREATE POLICY "users_own_call_history" ON call_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = call_history.user_id
      AND auth.uid()::text = users.id::text
    )
  );

-- Blocked times policies
DROP POLICY IF EXISTS "users_own_blocked_times" ON blocked_times;
CREATE POLICY "users_own_blocked_times" ON blocked_times
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = blocked_times.user_id
      AND auth.uid()::text = users.id::text
    )
  );

-- Schedule helper policies
DROP POLICY IF EXISTS "users_own_schedule_helper" ON schedule_helper;
CREATE POLICY "users_own_schedule_helper" ON schedule_helper
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = schedule_helper.user_id
      AND auth.uid()::text = users.id::text
    )
  );

-- ==========================================
-- STEP 6: FUNCTIONS
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_schedule_helper_updated_at ON schedule_helper;
CREATE TRIGGER update_schedule_helper_updated_at
  BEFORE UPDATE ON schedule_helper
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'Database setup completed successfully!' as status;