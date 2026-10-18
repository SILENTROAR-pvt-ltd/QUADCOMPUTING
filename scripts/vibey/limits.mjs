// Phase 0: one tiny chat call per candidate model, to read the provider's rate-limit headers and check JSON mode.
// Run: node scripts/vibey/limits.mjs [model ...]   (reads LLM_BASE_URL / LLM_API_KEY from .env.local; prints no secrets)
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
const base = (process.env.LLM_BASE_URL || '').replace(/\/$/, '');
const key = process.env.LLM_API_KEY || '';
const models = process.argv.slice(2).length ? process.argv.slice(2) : ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
const reasoning = (m) => (/gpt-oss/.test(m) ? { reasoning_effort: 'low' } : /qwen3/.test(m) ? { reasoning_effort: 'none' } : {});

for (const model of models) {
  const started = Date.now();
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, temperature: 0, max_tokens: 60, response_format: { type: 'json_object' }, ...reasoning(model),
      messages: [{ role: 'system', content: 'Reply with JSON {"ok":true}.' }, { role: 'user', content: 'ping' }],
    }),
  });
  const body = await res.json().catch(() => ({}));
  console.log(`\n${model}: HTTP ${res.status} in ${Date.now() - started} ms`);
  for (const [k, v] of res.headers.entries()) if (k.startsWith('x-ratelimit') || k === 'retry-after') console.log(`  ${k}: ${v}`);
  console.log(`  content: ${JSON.stringify(body?.choices?.[0]?.message?.content ?? body?.error?.message ?? '').slice(0, 120)}`);
}
