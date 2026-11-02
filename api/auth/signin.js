import crypto from 'crypto';
import { getPool, ensureTables, verifySecret } from '../_db.js';

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

  const { email, password } = req.body || {};
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail || !password) {
    return res.status(400).json({ success: false, message: 'Email and password required.' });
  }

  const db = getPool();
  if (!db) {
    const fallbackUser = {
      id: Date.now(),
      email: cleanEmail,
      name: cleanEmail.split('@')[0],
      role: 'user',
      mode: 'email',
      authenticatedAt: new Date().toISOString(),
      offline: true
    };
    return res.status(200).json({
      success: true,
      user: fallbackUser,
      token: crypto.randomBytes(24).toString('hex'),
      message: 'Signed in locally.'
    });
  }

  try {
    await ensureTables();

    const userRes = await db.query(
      `SELECT id, email, username, password_hash, salt, role FROM users WHERE email = $1`,
      [cleanEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = userRes.rows[0];
    const isValid = verifySecret(password, user.salt, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Update last_login_at
    await db.query(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]);

    const sessionToken = crypto.randomBytes(32).toString('hex');
    await db.query(
      `INSERT INTO sessions (user_id, token, device_info) VALUES ($1, $2, $3)`,
      [user.id, sessionToken, req.headers['user-agent'] || 'web']
    );

    return res.status(200).json({
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.username,
        role: user.role,
        authenticatedAt: new Date().toISOString()
      },
      message: 'Signed in successfully across devices.'
    });
  } catch (err) {
    console.error('[API Signin Error]', err);
    return res.status(500).json({ success: false, message: 'Database error: ' + err.message });
  }
}
