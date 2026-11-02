import pg from 'pg';
import crypto from 'crypto';

const { Pool } = pg;

let pool = null;
let tablesInitialized = false;

const DEFAULT_SUPABASE_URL = 'postgresql://postgres.aubylaqaerlposhzfzkh:aRrCeQDBiz9gL8lY@aws-0-eu-west-1.pooler.supabase.com:5432/postgres';

export function getPool() {
  let connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || DEFAULT_SUPABASE_URL;
  if (!connectionString) {
    return null;
  }
  // Auto-heal Supabase IPv6 direct domain to IPv4 connection pooler
  if (connectionString.includes('db.aubylaqaerlposhzfzkh.supabase.co')) {
    connectionString = connectionString.replace('db.aubylaqaerlposhzfzkh.supabase.co', 'aws-0-eu-west-1.pooler.supabase.com');
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export function hashSecret(secretStr, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  const hashed = crypto
    .pbkdf2Sync(secretStr, salt, 100000, 32, 'sha256')
    .toString('hex');
  return { hash: hashed, salt };
}

export function verifySecret(secretStr, salt, expectedHash) {
  if (!secretStr || !salt || !expectedHash) return false;
  const { hash } = hashSecret(secretStr, salt);
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
  } catch (e) {
    return hash === expectedHash;
  }
}

export async function ensureTables() {
  if (tablesInitialized) return;
  const db = getPool();
  if (!db) return;

  const queries = [
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      username VARCHAR(100) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      salt VARCHAR(64) NOT NULL,
      passcode_hash VARCHAR(255),
      role VARCHAR(50) DEFAULT 'user',
      preferences TEXT DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      last_login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      device_info VARCHAR(255) DEFAULT 'web',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP WITH TIME ZONE
    );`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);`,
    `CREATE TABLE IF NOT EXISTS chat_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      user_email VARCHAR(255),
      session_id VARCHAR(100) DEFAULT 'default',
      sender VARCHAR(50) NOT NULL,
      bot_id VARCHAR(50) DEFAULT 'orchestrator',
      bot_name VARCHAR(100) DEFAULT 'Orchestrator',
      message TEXT NOT NULL,
      extra_data TEXT DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE INDEX IF NOT EXISTS idx_chat_email_created ON chat_history(user_email, created_at);`
  ];

  for (const q of queries) {
    try {
      await db.query(q);
    } catch (err) {
      console.warn('[Ultron Vercel DB Init Notice]', err.message);
    }
  }
  tablesInitialized = true;
}
