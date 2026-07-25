import { createClient } from '@vercel/kv';

// Works with both Vercel KV and Upstash-for-Redis env var names
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const KEY = 'punchlist-461-anderson';

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
    const { id, done } = req.body || {};
    if (typeof id !== 'string' || !id) {
      return res.status(400).json({ error: 'bad-request' });
    }
    const state = (await kv.get(KEY)) || {};
    if (done) state[id] = 1;
    else delete state[id];
    await kv.set(KEY, state);
    return res.status(200).json(state);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'method-not-allowed' });
}
