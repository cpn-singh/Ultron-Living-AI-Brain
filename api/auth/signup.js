import crypto from 'crypto';
import { getPool, ensureTables, hashSecret } from '../_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { name, email, password, passcode } = req.body || {};
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanName = (name || '').trim() || cleanEmail.split('@')[0];

  if (!cleanEmail || !password || password.length < 6) {
    return res.status(400).json({ success: false, message: 'Valid email and password (min 6 chars) required.' });
  }

  const db = getPool();
  if (!db) {
    // If no DATABASE_URL configured yet on Vercel, return fallback session
    const fallbackUser = {
      id: Date.now(),
      email: cleanEmail,
      name: cleanName,
      role: 'user',
      mode: 'email',
      authenticatedAt: new Date().toISOString(),
      offline: true
    };
    return res.status(200).json({
      success: true,
      user: fallbackUser,
      token: crypto.randomBytes(24).toString('hex'),
      message: 'Signed up in client session (Connect DATABASE_URL in Vercel to sync across all devices).'
    });
  }

  try {
    await ensureTables();

    // Check if user already exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Account with this email already exists.' });
    }

    const { hash: passwordHash, salt } = hashSecret(password);
    let passcodeHash = null;
    if (passcode && passcode.trim()) {
      passcodeHash = hashSecret(passcode.trim(), salt).hash;
    }

    const insertResult = await db.query(
      `INSERT INTO users (email, username, password_hash, salt, passcode_hash, role)
       VALUES ($1, $2, $3, $4, $5, 'user')
       RETURNING id, email, username, role, created_at`,
      [cleanEmail, cleanName, passwordHash, salt, passcodeHash]
    );

    const newUser = insertResult.rows[0];
    const sessionToken = crypto.randomBytes(32).toString('hex');

    await db.query(
      `INSERT INTO sessions (user_id, token, device_info) VALUES ($1, $2, $3)`,
      [newUser.id, sessionToken, req.headers['user-agent'] || 'web']
    );

    return res.status(200).json({
      success: true,
      token: sessionToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.username,
        role: newUser.role,
        authenticatedAt: new Date().toISOString()
      },
      message: 'Account registered and synchronized with Cloud Database.'
    });
  } catch (err) {
    console.error('[API Signup Error]', err);
    return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
  }
}
