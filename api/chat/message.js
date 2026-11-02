import { getPool, ensureTables } from '../_db.js';

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

  const { userEmail, sender, botId, botName, text, mode, metadata } = req.body || {};
  const cleanEmail = (userEmail || '').trim().toLowerCase();

  const db = getPool();
  if (!db || !cleanEmail || !text) {
    return res.status(200).json({ success: true });
  }

  try {
    await ensureTables();
    const result = await db.query(
      `INSERT INTO chat_history (user_email, sender, bot_id, bot_name, message, extra_data)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [
        cleanEmail,
        sender || 'User',
        botId || 'orchestrator',
        botName || 'ULTRON',
        text,
        JSON.stringify({ mode: mode || 'chat', ...(metadata || {}) })
      ]
    );
    return res.status(200).json({ success: true, id: result.rows[0]?.id });
  } catch (err) {
    console.error('[API Chat Message Error]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
