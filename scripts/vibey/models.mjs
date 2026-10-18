// Phase 0: which models the configured provider offers today, and its rate-limit headers.
// Run: node scripts/vibey/models.mjs   (reads LLM_BASE_URL and LLM_API_KEY from .env.local; prints no secrets)
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
const base = (process.env.LLM_BASE_URL || '').replace(/\/$/, '');
const key = process.env.LLM_API_KEY || '';
if (!base || !key) { console.error('LLM_BASE_URL and LLM_API_KEY must be set in .env.local'); process.exit(1); }

const res = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${key}` } });
console.log(`GET /models -> ${res.status}`);
const limits = [...res.headers.entries()].filter(([k]) => k.startsWith('x-ratelimit'));
for (const [k, v] of limits) console.log(`  ${k}: ${v}`);
const json = await res.json();
const models = (json.data || []).map((m) => ({ id: m.id, owner: m.owned_by, ctx: m.context_window ?? '', active: m.active ?? '' }));
models.sort((a, b) => a.id.localeCompare(b.id));
for (const m of models) console.log(`${m.id.padEnd(48)} ${String(m.owner).padEnd(14)} ctx=${m.ctx} active=${m.active}`);
