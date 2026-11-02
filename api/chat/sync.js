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

  const { userEmail, messages } = req.body || {};
  const cleanEmail = (userEmail || '').trim().toLowerCase();

  if (!cleanEmail || !Array.isArray(messages)) {
    return res.status(400).json({ success: false, message: 'userEmail and messages array required.' });
  }

  const db = getPool();
  if (!db) {
    return res.status(200).json({ success: true, messages });
  }

  try {
    await ensureTables();
    for (const msg of messages) {
      if (!msg || !msg.text) continue;
      await db.query(
        `INSERT INTO chat_history (user_email, sender, bot_id, bot_name, message, extra_data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          cleanEmail,
          msg.sender || 'User',
          msg.botId || 'orchestrator',
          msg.botName || 'ULTRON',
          msg.text || '',
          JSON.stringify({
            mode: msg.mode || 'chat',
            tokens: msg.tokens || 0,
            model: msg.model || 'Gemini 2.5 Flash'
          })
        ]
      );
    }
    return res.status(200).json({ success: true, count: messages.length });
  } catch (err) {
    console.error('[API Chat Sync Error]', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
