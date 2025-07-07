-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table: Stores user data based on their wallet address
CREATE TABLE IF NOT EXISTS users (
    wallet_address TEXT PRIMARY KEY NOT NULL,
    line_credits INT NOT NULL DEFAULT 0,
    nuke_credits INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sessions Table: Stores information about each whiteboard session
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(),
    short_code TEXT UNIQUE NOT NULL,
    owner_wallet_address TEXT NOT NULL REFERENCES users(wallet_address),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drawings Table: Stores each drawing action to reconstruct the board state
CREATE TABLE IF NOT EXISTS drawings (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    drawer_wallet_address TEXT NOT NULL REFERENCES users(wallet_address),
    drawing_data JSONB NOT NULL, -- e.g., { "from": [x, y], "to": [x, y], "color": "#FFFFFF" }
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Revenue Table: Tracks unclaimed earnings for streamers
CREATE TABLE IF NOT EXISTS revenue (
    streamer_wallet_address TEXT PRIMARY KEY NOT NULL REFERENCES users(wallet_address),
    unclaimed_sol NUMERIC(20, 9) NOT NULL DEFAULT 0 -- Using NUMERIC for precision with SOL
);

-- Transactions Table: An audit log for all financial activities
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    signature TEXT UNIQUE, -- Solana transaction signature, can be NULL for internal credit usage
    user_wallet_address TEXT NOT NULL REFERENCES users(wallet_address),
    transaction_type TEXT NOT NULL, -- 'purchase_lines', 'purchase_nuke', 'draw_line', 'nuke_board', 'claim_revenue'
    sol_amount NUMERIC(20, 9) NOT NULL,
    credit_amount INT, -- e.g., 10 for 10 lines
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS sessions_owner_idx ON sessions(owner_wallet_address);
CREATE INDEX IF NOT EXISTS drawings_session_idx ON drawings(session_id);
CREATE INDEX IF NOT EXISTS transactions_user_idx ON transactions(user_wallet_address);
