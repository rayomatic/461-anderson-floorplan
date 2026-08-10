import { createClient } from '@vercel/kv';

// Works with both Vercel KV and Upstash-for-Redis env var names
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const KEY = 'punchlist-461-anderson-comments';

export default async function handler(req, res) {
  if (!url || !token) {
    return res.status(503).json({ error: 'kv-not-configured' });
  }
  const kv = createClient({ url, token });

  if (req.method === 'GET') {
    const state = (await kv.get(KEY)) || {};
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(state);
  }

  if (req.method === 'POST') {
    const { num, text } = req.body || {};
    const n = parseInt(num, 10);
    if (!Number.isInteger(n) || typeof text !== 'string' || !text.trim() || text.length > 2000) {
      return res.status(400).json({ error: 'bad-request' });
    }
    const state = (await kv.get(KEY)) || {};
    const list = Array.isArray(state[n]) ? state[n] : [];
    list.push({ text: text.trim(), at: new Date().toISOString() });
    state[n] = list;
    await kv.set(KEY, state);
    return res.status(200).json(state);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'method-not-allowed' });
}
