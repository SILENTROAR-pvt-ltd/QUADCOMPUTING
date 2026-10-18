// Phase 0 live eval: every golden case through each candidate model, paced to the provider's per-model token limit.
// Writes tests/vibey/golden/recorded-<model>.json (replayed by the offline golden test) and docs/vibey/eval-results.json.
import fs from 'node:fs';
import path from 'node:path';
import { it } from 'vitest';
import { chatJson } from '@/lib/vibey/core/llm';
import { buildGuestGraph, runGuestTurn } from '@/lib/vibey/guest/graph';
import { candidatesFor } from '@/lib/vibey/guest/retrieve';
import { respond } from '@/lib/vibey/guest/respond';
import { buildPrompt, groundUnderstood, understoodSchema } from '@/lib/vibey/guest/understand';
import { DEMO_FEATURED, DEMO_MENU } from '../fixtures/demo-menu';
import { loadGolden, scoreCase, trayOf, type CaseScore, type GoldenCase } from '../golden/score';

const MODELS = (process.env.VIBEY_EVAL_MODELS || 'openai/gpt-oss-120b,openai/gpt-oss-20b,qwen/qwen3.8-27b').split(',').map((s) => s.trim()).filter(Boolean);
const TPM = 7200; // under the 8,000 tokens/minute the provider allows per model
const JSON_OFF_CASES = 20;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pct = (xs: number[], p: number) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor((p / 100) * xs.length))] : 0);
const share = (xs: CaseScore[], f: (s: CaseScore) => boolean) => Number((xs.filter(f).length / Math.max(1, xs.length)).toFixed(3));

/** Paces calls to one model under its tokens-per-minute limit, and waits out a 429. */
function pacer() {
  const spent: Array<{ at: number; tokens: number }> = [];
  return async function call<T>(fn: () => Promise<T & { usage: { tokensIn: number; tokensOut: number } }>): Promise<T & { usage: any }> {
    for (let attempt = 0; ; attempt += 1) {
      const now = Date.now();
      while (spent.length && now - spent[0].at > 60_000) spent.shift();
      const used = spent.reduce((s, x) => s + x.tokens, 0);
      if (used > TPM - 1200) { await sleep(60_000 - (now - spent[0].at) + 250); continue; }
      try {
        const out = await fn();
        spent.push({ at: Date.now(), tokens: out.usage.tokensIn + out.usage.tokensOut });
        return out;
      } catch (err: any) {
        if (err?.code === 'rate_limited' && attempt < 4) { await sleep(15_000); continue; }
        spent.push({ at: Date.now(), tokens: 900 });
        throw err;
      }
    }
  };
}

const prompt = (c: GoldenCase) => buildPrompt(c.text, c.history ?? [], candidatesFor(c.text, DEMO_MENU, 20));
const noJsonMode: typeof fetch = (url, init) => {
  const body = JSON.parse(String(init?.body));
  delete body.response_format;
  return fetch(url, { ...init, body: JSON.stringify(body) });
};

async function evalModel(model: string, cases: GoldenCase[]) {
  const call = pacer();
  const outputs: Record<string, unknown> = {};
  const lat: number[] = []; const tin: number[] = []; const tout: number[] = [];
  const modelOnly: CaseScore[] = [];
  const failures: Record<string, string> = {};
  for (const c of cases) {
    try {
      const { data, usage } = await call(() => chatJson({ ...prompt(c), schema: understoodSchema, model, timeoutMs: 20_000, maxTokens: 400 }));
      outputs[c.id] = data;
      lat.push(usage.ms); tin.push(usage.tokensIn); tout.push(usage.tokensOut);
      const understood = groundUnderstood(data, c.text, c.history ?? []);
      modelOnly.push(scoreCase(c, respond({ understood, req: { text: c.text, tray: trayOf(c) }, menu: DEMO_MENU, featured: DEMO_FEATURED, path: 'model', ms: 0 })));
    } catch (err: any) {
      failures[c.id] = String(err?.code || err?.message);
    }
  }
  // What ships: the graph decides when to ask the model, and gets this model's recorded answer when it does.
  const shipping: CaseScore[] = [];
  let modelTurns = 0;
  for (const c of cases) {
    const graph = buildGuestGraph({
      reserveModel: async () => true,
      understand: async () => {
        modelTurns += 1;
        if (!outputs[c.id]) throw Object.assign(new Error('no output'), { code: 'http' });
        return { data: outputs[c.id] as any, usage: { model, ms: 0, tokensIn: 0, tokensOut: 0 } };
      },
    });
    const { reply } = await runGuestTurn(graph, { businessId: 'demo', menu: DEMO_MENU, featured: DEMO_FEATURED, req: { cafe_id: 'demo', table_number: '4', text: c.text, tray: trayOf(c), history: c.history ?? [] } });
    shipping.push(scoreCase(c, reply));
  }
  let jsonOffValid = 0;
  for (const c of cases.slice(0, JSON_OFF_CASES)) {
    try { await call(() => chatJson({ ...prompt(c), schema: understoodSchema, model, timeoutMs: 20_000, maxTokens: 400, fetchImpl: noJsonMode })); jsonOffValid += 1; } catch { /* counted as invalid */ }
  }
  const slug = model.replace(/[^a-z0-9]+/gi, '-');
  fs.writeFileSync(path.join(__dirname, '..', 'golden', `recorded-${slug}.json`), JSON.stringify({ model, outputs }, null, 1));
  return {
    model,
    modelOnly: {
      validJson: share(cases.map((c) => ({ id: c.id } as any)), (s: any) => Boolean(outputs[s.id])),
      intent: share(modelOnly, (s) => s.intentOk), exact: share(modelOnly, (s) => s.exact),
      wrongAdds: modelOnly.reduce((n, s) => n + s.wrongAdds.length + s.wrongEdits.length, 0),
      latencyMs: { p50: pct(lat, 50), p95: pct(lat, 95) }, tokensIn: Math.round(pct(tin, 50)), tokensOut: Math.round(pct(tout, 50)),
      failures,
      misses: modelOnly.filter((s) => !s.exact).map((s) => `${s.id}: ${s.problems.join('; ')}`),
    },
    shipping: {
      intent: share(shipping, (s) => s.intentOk), exact: share(shipping, (s) => s.exact),
      wrongAdds: shipping.reduce((n, s) => n + s.wrongAdds.length + s.wrongEdits.length, 0),
      modelTurnShare: Number((modelTurns / cases.length).toFixed(3)),
      misses: shipping.filter((s) => !s.exact).map((s) => `${s.id}: ${s.problems.join('; ')}`),
    },
    jsonModeOff: { validAfterRepair: Number((jsonOffValid / Math.min(JSON_OFF_CASES, cases.length)).toFixed(3)) },
  };
}

it('evaluates the candidate models on the golden set', async () => {
  const cases = loadGolden();
  const results = await Promise.all(MODELS.map((m) => evalModel(m, cases)));
  const out = path.join(__dirname, '..', '..', '..', 'docs', 'vibey');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'eval-results.json'), JSON.stringify({ at: new Date().toISOString(), cases: cases.length, results }, null, 2));
  for (const r of results) {
    console.log(`[eval] ${r.model}: model-only intent ${r.modelOnly.intent} exact ${r.modelOnly.exact} wrongAdds ${r.modelOnly.wrongAdds} json ${r.modelOnly.validJson} p50 ${r.modelOnly.latencyMs.p50}ms p95 ${r.modelOnly.latencyMs.p95}ms | shipping intent ${r.shipping.intent} exact ${r.shipping.exact} wrongAdds ${r.shipping.wrongAdds} modelTurns ${r.shipping.modelTurnShare}`);
  }
});
