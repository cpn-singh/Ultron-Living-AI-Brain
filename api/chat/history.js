import { getPool, ensureTables } from '../_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { email, limit = 300 } = req.query || {};
  const cleanEmail = (email || '').trim().toLowerCase();

  const db = getPool();
  if (!db || !cleanEmail) {
    return res.status(200).json({ success: true, messages: [] });
  }

  try {
    await ensureTables();
    const result = await db.query(
      `SELECT id, user_email, sender, bot_id, bot_name, message, extra_data, created_at
       FROM chat_history
       WHERE user_email = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [cleanEmail, parseInt(limit, 10) || 300]
    );

    const messages = result.rows.map(r => {
      let extra = {};
      try { extra = JSON.parse(r.extra_data || '{}'); } catch (e) {}
      return {
        id: r.id,
        sender: r.sender,
        botId: r.bot_id,
        botName: r.bot_name,
        text: r.message,
        timestamp: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
        ...extra
      };
    });

    return res.status(200).json({ success: true, messages });
  } catch (err) {
    console.error('[API Chat History Error]', err);
    return res.status(500).json({ success: false, messages: [], error: err.message });
  }
}
