import { getPool } from '../_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const db = getPool();
  if (!db) {
    return res.status(200).json({
      success: true,
      connected: false,
      engine: 'Client Cache',
      message: 'No DATABASE_URL configured in Vercel. Operating in resilient client session mode.'
    });
  }

  try {
    const start = Date.now();
    const result = await db.query('SELECT NOW() as current_time, count(*) as user_count FROM users');
    const latency = Date.now() - start;
    return res.status(200).json({
      success: true,
      connected: true,
      engine: 'PostgreSQL Cloud',
      latencyMs: latency,
      users: parseInt(result.rows[0]?.user_count || 0, 10),
      timestamp: result.rows[0]?.current_time
    });
  } catch (err) {
    return res.status(200).json({
      success: false,
      connected: false,
      engine: 'PostgreSQL Cloud',
      error: err.message
    });
  }
}
