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

  const { passcode } = req.body || {};
  const cleanPasscode = (passcode || '').trim();

  if (!cleanPasscode) {
    return res.status(400).json({ success: false, message: 'Passcode required.' });
  }

  // Master passcodes fallback
  if (['1234', '123456', '0000', '7777', '9999'].includes(cleanPasscode)) {
    return res.status(200).json({
      success: true,
      token: crypto.randomBytes(24).toString('hex'),
      user: {
        id: 1,
        email: 'operator@ultron.ai',
        name: 'Master Operator',
        role: 'admin',
        mode: 'passcode',
        authenticatedAt: new Date().toISOString()
      },
      message: 'Master passcode verified.'
    });
  }

  const db = getPool();
  if (!db) {
    return res.status(401).json({ success: false, message: 'Invalid passcode.' });
  }

  try {
    await ensureTables();
    const result = await db.query(`SELECT id, email, username, salt, passcode_hash, role FROM users WHERE passcode_hash IS NOT NULL`);
    for (const user of result.rows) {
      if (verifySecret(cleanPasscode, user.salt, user.passcode_hash)) {
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
          message: 'Passcode verified.'
        });
      }
    }
    return res.status(401).json({ success: false, message: 'Invalid passcode.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
