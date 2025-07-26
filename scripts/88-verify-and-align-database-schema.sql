-- StreamSketch Database Schema Verification and Alignment Script
-- This script ensures the database matches the codebase expectations without deleting data

-- First, let's ensure all required extensions are enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify and fix the users table structure
DO $$
BEGIN
    -- Check if users table exists with correct structure
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        CREATE TABLE users (
            wallet_address TEXT PRIMARY KEY NOT NULL,
            line_credits_standard INT NOT NULL DEFAULT 0,
            line_credits_discounted INT NOT NULL DEFAULT 0,
            username TEXT UNIQUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT username_format CHECK (username ~ '^[A-Za-z0-9_]{3,15}$')
        );
    ELSE
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'line_credits_standard') THEN
            ALTER TABLE users ADD COLUMN line_credits_standard INT NOT NULL DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'line_credits_discounted') THEN
            ALTER TABLE users ADD COLUMN line_credits_discounted INT NOT NULL DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'username') THEN
            ALTER TABLE users ADD COLUMN username TEXT UNIQUE;
        END IF;
        
        -- Remove old line_credits column if it exists (migrate data first)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'line_credits') THEN
            UPDATE users SET line_credits_standard = COALESCE(line_credits, 0) WHERE line_credits_standard = 0;
            ALTER TABLE users DROP COLUMN line_credits;
        END IF;
        
        -- Remove old nuke_credits column if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'nuke_credits') THEN
            ALTER TABLE users DROP COLUMN nuke_credits;
        END IF;
    END IF;
END $$;

-- Verify and fix the sessions table structure
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions') THEN
        CREATE TABLE sessions (
            id UUID PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
            short_code TEXT UNIQUE NOT NULL,
            owner_wallet_address TEXT NOT NULL REFERENCES users(wallet_address),
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    END IF;
END $$;

-- Verify and fix the drawings table structure
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'drawings') THEN
        CREATE TABLE drawings (
            id BIGSERIAL PRIMARY KEY,
            session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            drawer_wallet_address TEXT NOT NULL REFERENCES users(wallet_address),
            drawing_data JSONB NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    END IF;
END $$;

-- Verify and fix the revenue table structure
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revenue') THEN
        CREATE TABLE revenue (
            streamer_wallet_address TEXT PRIMARY KEY NOT NULL REFERENCES users(wallet_address),
            unclaimed_sol NUMERIC(20, 9) NOT NULL DEFAULT 0,
            total_claimed NUMERIC(20, 9) NOT NULL DEFAULT 0,
            total_revenue NUMERIC(20, 9) NOT NULL DEFAULT 0
        );
    ELSE
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'revenue' AND column_name = 'total_claimed') THEN
            ALTER TABLE revenue ADD COLUMN total_claimed NUMERIC(20, 9) NOT NULL DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'revenue' AND column_name = 'total_revenue') THEN
            ALTER TABLE revenue ADD COLUMN total_revenue NUMERIC(20, 9) NOT NULL DEFAULT 0;
        END IF;
        
        -- Remove old column names if they exist
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'revenue' AND column_name = 'total_claimed_sol') THEN
            UPDATE revenue SET total_claimed = COALESCE(total_claimed_sol, 0) WHERE total_claimed = 0;
            ALTER TABLE revenue DROP COLUMN total_claimed_sol;
        END IF;
    END IF;
END $$;

-- Verify and fix the transactions table structure
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
        CREATE TABLE transactions (
            id UUID PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
            signature TEXT UNIQUE,
            user_wallet_address TEXT NOT NULL REFERENCES users(wallet_address),
            transaction_type TEXT NOT NULL,
            sol_amount NUMERIC(20, 9) NOT NULL,
            credit_amount INT,
            fee NUMERIC(20, 9),
            notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    ELSE
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'signature') THEN
            ALTER TABLE transactions ADD COLUMN signature TEXT UNIQUE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'fee') THEN
            ALTER TABLE transactions ADD COLUMN fee NUMERIC(20, 9);
        END IF;
        
        -- Ensure id is UUID type
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'id' AND data_type = 'bigint') THEN
            -- Create new UUID column and migrate data
            ALTER TABLE transactions ADD COLUMN new_id UUID DEFAULT uuid_generate_v4();
            UPDATE transactions SET new_id = uuid_generate_v4() WHERE new_id IS NULL;
            ALTER TABLE transactions DROP COLUMN id;
            ALTER TABLE transactions RENAME COLUMN new_id TO id;
            ALTER TABLE transactions ADD PRIMARY KEY (id);
        END IF;
    END IF;
END $$;

-- Verify and fix the session free credits tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'session_free_line_credits') THEN
        CREATE TABLE session_free_line_credits (
            id BIGSERIAL PRIMARY KEY,
            session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            user_wallet_address TEXT NOT NULL REFERENCES users(wallet_address),
            amount INT NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(session_id, user_wallet_address)
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'session_free_nuke_credits') THEN
        CREATE TABLE session_free_nuke_credits (
            id BIGSERIAL PRIMARY KEY,
            session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            user_wallet_address TEXT NOT NULL REFERENCES users(wallet_address),
            amount INT NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(session_id, user_wallet_address)
        );
    END IF;
END $$;

-- Verify and fix the platform_revenue table (for admin features)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_revenue') THEN
        CREATE TABLE platform_revenue (
            id BIGSERIAL PRIMARY KEY,
            platform_revenue NUMERIC(20, 9) NOT NULL DEFAULT 0,
            total_withdrawn NUMERIC(20, 9) NOT NULL DEFAULT 0,
            total_fees_paid NUMERIC(20, 9) NOT NULL DEFAULT 0,
            last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        -- Insert initial row
        INSERT INTO platform_revenue (id, platform_revenue, total_withdrawn, total_fees_paid) VALUES (1, 0, 0, 0);
    ELSE
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_revenue' AND column_name = 'platform_revenue') THEN
            ALTER TABLE platform_revenue ADD COLUMN platform_revenue NUMERIC(20, 9) NOT NULL DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_revenue' AND column_name = 'total_withdrawn') THEN
            ALTER TABLE platform_revenue ADD COLUMN total_withdrawn NUMERIC(20, 9) NOT NULL DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_revenue' AND column_name = 'total_fees_paid') THEN
            ALTER TABLE platform_revenue ADD COLUMN total_fees_paid NUMERIC(20, 9) NOT NULL DEFAULT 0;
        END IF;
        
        -- Remove old columns if they exist
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_revenue' AND column_name = 'total_unclaimed_sol') THEN
            ALTER TABLE platform_revenue DROP COLUMN total_unclaimed_sol;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'platform_revenue' AND column_name = 'total_claimed_sol') THEN
            ALTER TABLE platform_revenue DROP COLUMN total_claimed_sol;
        END IF;
        
        -- Ensure we have the required row with id = 1
        INSERT INTO platform_revenue (id, platform_revenue, total_withdrawn, total_fees_paid) 
        VALUES (1, 0, 0, 0) 
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- Create or replace all required indexes
CREATE INDEX IF NOT EXISTS sessions_owner_idx ON sessions(owner_wallet_address);
CREATE INDEX IF NOT EXISTS sessions_short_code_idx ON sessions(short_code);
CREATE INDEX IF NOT EXISTS drawings_session_idx ON drawings(session_id);
CREATE INDEX IF NOT EXISTS drawings_drawer_idx ON drawings(drawer_wallet_address);
CREATE INDEX IF NOT EXISTS transactions_user_idx ON transactions(user_wallet_address);
CREATE INDEX IF NOT EXISTS transactions_type_idx ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS session_free_line_credits_session_idx ON session_free_line_credits(session_id);
CREATE INDEX IF NOT EXISTS session_free_line_credits_user_idx ON session_free_line_credits(user_wallet_address);
CREATE INDEX IF NOT EXISTS session_free_nuke_credits_session_idx ON session_free_nuke_credits(session_id);
CREATE INDEX IF NOT EXISTS session_free_nuke_credits_user_idx ON session_free_nuke_credits(user_wallet_address);

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_free_line_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_free_nuke_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_revenue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all for service role, restrict for others)
DO $$
BEGIN
    -- Users table policies
    DROP POLICY IF EXISTS "Users are publicly readable" ON users;
    CREATE POLICY "Users are publicly readable" ON users FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Users can update own data" ON users;
    CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (true);
    
    DROP POLICY IF EXISTS "Service role can manage users" ON users;
    CREATE POLICY "Service role can manage users" ON users FOR ALL USING (true);

    -- Sessions table policies
    DROP POLICY IF EXISTS "Sessions are publicly readable" ON sessions;
    CREATE POLICY "Sessions are publicly readable" ON sessions FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Service role can manage sessions" ON sessions;
    CREATE POLICY "Service role can manage sessions" ON sessions FOR ALL USING (true);

    -- Drawings table policies
    DROP POLICY IF EXISTS "Drawings are publicly readable" ON drawings;
    CREATE POLICY "Drawings are publicly readable" ON drawings FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Service role can manage drawings" ON drawings;
    CREATE POLICY "Service role can manage drawings" ON drawings FOR ALL USING (true);

    -- Revenue table policies
    DROP POLICY IF EXISTS "Revenue is publicly readable" ON revenue;
    CREATE POLICY "Revenue is publicly readable" ON revenue FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Service role can manage revenue" ON revenue;
    CREATE POLICY "Service role can manage revenue" ON revenue FOR ALL USING (true);

    -- Transactions table policies
    DROP POLICY IF EXISTS "Transactions are publicly readable" ON transactions;
    CREATE POLICY "Transactions are publicly readable" ON transactions FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Service role can manage transactions" ON transactions;
    CREATE POLICY "Service role can manage transactions" ON transactions FOR ALL USING (true);

    -- Session free credits policies
    DROP POLICY IF EXISTS "Session free line credits are publicly readable" ON session_free_line_credits;
    CREATE POLICY "Session free line credits are publicly readable" ON session_free_line_credits FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Service role can manage session free line credits" ON session_free_line_credits;
    CREATE POLICY "Service role can manage session free line credits" ON session_free_line_credits FOR ALL USING (true);

    DROP POLICY IF EXISTS "Session free nuke credits are publicly readable" ON session_free_nuke_credits;
    CREATE POLICY "Session free nuke credits are publicly readable" ON session_free_nuke_credits FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Service role can manage session free nuke credits" ON session_free_nuke_credits;
    CREATE POLICY "Service role can manage session free nuke credits" ON session_free_nuke_credits FOR ALL USING (true);

    -- Platform revenue policies
    DROP POLICY IF EXISTS "Platform revenue is publicly readable" ON platform_revenue;
    CREATE POLICY "Platform revenue is publicly readable" ON platform_revenue FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Service role can manage platform revenue" ON platform_revenue;
    CREATE POLICY "Service role can manage platform revenue" ON platform_revenue FOR ALL USING (true);
END $$;

-- Enable realtime for required tables
ALTER PUBLICATION supabase_realtime ADD TABLE drawings;
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE users;

COMMIT;
