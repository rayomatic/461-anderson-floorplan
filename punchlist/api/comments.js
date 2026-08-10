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
    const { op = 'add', num, text, idx, ridx } = req.body || {};
    const n = parseInt(num, 10);
    if (!Number.isInteger(n)) {
      return res.status(400).json({ error: 'bad-request' });
    }
    if (op !== 'delete' && (typeof text !== 'string' || !text.trim() || text.length > 2000)) {
      return res.status(400).json({ error: 'bad-request' });
    }
    const t = op !== 'delete' ? text.trim() : '';
    const now = new Date().toISOString();
    const state = (await kv.get(KEY)) || {};
    const list = Array.isArray(state[n]) ? state[n] : [];

    if (op === 'add') {
      list.push({ text: t, at: now });
    } else if (op === 'reply') {
      const c = Number.isInteger(idx) ? list[idx] : null;
      if (!c) return res.status(400).json({ error: 'bad-index' });
      c.replies = Array.isArray(c.replies) ? c.replies : [];
      c.replies.push({ text: t, at: now });
    } else if (op === 'edit') {
      const c = Number.isInteger(idx) ? list[idx] : null;
      if (!c) return res.status(400).json({ error: 'bad-index' });
      if (ridx !== undefined && ridx !== null) {
        const r = Number.isInteger(ridx) && Array.isArray(c.replies) ? c.replies[ridx] : null;
        if (!r) return res.status(400).json({ error: 'bad-index' });
        r.text = t;
        r.edited = now;
      } else {
        c.text = t;
        c.edited = now;
      }
    } else if (op === 'delete') {
      const c = Number.isInteger(idx) ? list[idx] : null;
      if (!c) return res.status(400).json({ error: 'bad-index' });
      if (ridx !== undefined && ridx !== null) {
        if (!(Number.isInteger(ridx) && Array.isArray(c.replies) && c.replies[ridx])) {
          return res.status(400).json({ error: 'bad-index' });
        }
        c.replies.splice(ridx, 1);
      } else {
        list.splice(idx, 1);
      }
    } else {
      return res.status(400).json({ error: 'bad-op' });
    }

    state[n] = list;
    await kv.set(KEY, state);
    return res.status(200).json(state);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'method-not-allowed' });
}
