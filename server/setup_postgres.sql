-- ============================================================
-- ULTRON Cybernetic AI Brain - PostgreSQL Database Setup
-- Database: ultron_db
-- ============================================================

-- Create database if running as postgres superuser
-- CREATE DATABASE ultron_db;
-- \c ultron_db;

-- 1. Users Table (Stores authenticated ULTRON operators & credentials)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    passcode_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Sessions Table (Stores active authentication tokens across Web & .exe desktop app)
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    device_info VARCHAR(255) DEFAULT 'desktop',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- 3. Chat History Table (Stores conversational transcripts synchronized with .exe)
CREATE TABLE IF NOT EXISTS chat_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    user_email VARCHAR(255),
    session_id VARCHAR(100) DEFAULT 'default',
    sender VARCHAR(50) NOT NULL,
    bot_id VARCHAR(50) DEFAULT 'orchestrator',
    bot_name VARCHAR(100) DEFAULT 'Orchestrator',
    message TEXT NOT NULL,
    extra_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_user_created ON chat_history(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_email_created ON chat_history(user_email, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_history(session_id);

-- 4. Long-Term Memory Bank Table (Persistent semantic facts & memories)
CREATE TABLE IF NOT EXISTS memories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    user_email VARCHAR(255),
    category VARCHAR(100) DEFAULT 'General',
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_email ON memories(user_email);
