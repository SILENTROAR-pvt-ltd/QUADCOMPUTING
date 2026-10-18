// The golden set, offline. Every case runs through the real guest graph. Where the graph asks the model, the answer is
// replayed from recorded.json (written by the live eval, tests/vibey/eval); with no recording the model "fails", which
// is the fallback path. Gates: zero wrong-dish adds always; every rules case exact without a model; with a recording,
// intent accuracy at least 95%.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildGuestGraph, runGuestTurn } from '@/lib/vibey/guest/graph';
import { LlmError } from '@/lib/vibey/core/llm';
import { DEMO_FEATURED, DEMO_MENU } from './fixtures/demo-menu';
import { loadGolden, scoreCase, trayOf, type CaseScore } from './golden/score';

const cases = loadGolden();
const recordedPath = path.join(__dirname, 'golden', 'recorded.json');
const recorded: { model?: string; outputs: Record<string, unknown> } = fs.existsSync(recordedPath)
  ? JSON.parse(fs.readFileSync(recordedPath, 'utf8'))
  : { outputs: {} };

async function runAll(replay: boolean): Promise<CaseScore[]> {
  const out: CaseScore[] = [];
  for (const c of cases) {
    const graph = buildGuestGraph({
      reserveModel: async () => true,
      understand: async () => {
        const data = replay ? recorded.outputs[c.id] : undefined;
        if (!data) throw new LlmError('no_key', 'offline');
        return { data: data as any, usage: { model: recorded.model ?? 'recorded', ms: 0, tokensIn: 0, tokensOut: 0 } };
      },
    });
    const { reply } = await runGuestTurn(graph, {
      businessId: 'demo', menu: DEMO_MENU, featured: DEMO_FEATURED,
      req: { cafe_id: 'demo', table_number: '4', text: c.text, tray: trayOf(c), history: c.history ?? [] },
    });
    out.push(scoreCase(c, reply));
  }
  return out;
}

describe('vibey golden set (offline)', () => {
  it('has a meaningful number of cases', () => {
    expect(cases.length).toBeGreaterThanOrEqual(140);
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length);
  });

  it('never adds or edits a dish the guest did not ask for, with or without the model', async () => {
    for (const replay of [false, true]) {
      const scores = await runAll(replay);
      const bad = scores.filter((s) => s.wrongAdds.length || s.wrongEdits.length);
      expect(bad.map((s) => `${s.id}: ${s.problems.join('; ')}`)).toEqual([]);
    }
  });

  it('answers every rules case exactly without any model', async () => {
    const scores = await runAll(false);
    const rules = new Set(cases.filter((c) => c.rules).map((c) => c.id));
    const failing = scores.filter((s) => rules.has(s.id) && !s.exact).map((s) => `${s.id}: ${s.problems.join('; ')}`);
    if (failing.length) console.log(`[golden] rules cases failing:\n  ${failing.join('\n  ')}`);
    expect(failing).toEqual([]);
  });

  it.runIf(Object.keys(recorded.outputs).length > 0)('reaches the intent and exactness targets with the recorded model', async () => {
    const scores = await runAll(true);
    const intent = scores.filter((s) => s.intentOk).length / scores.length;
    const exact = scores.filter((s) => s.exact).length / scores.length;
    console.log(`[golden] ${recorded.model}: intent ${(intent * 100).toFixed(1)}%, exact ${(exact * 100).toFixed(1)}%`);
    const misses = scores.filter((s) => !s.exact).map((s) => `${s.id}: ${s.problems.join('; ')}`);
    if (misses.length) console.log(`[golden] misses:\n  ${misses.join('\n  ')}`);
    expect(intent).toBeGreaterThanOrEqual(0.95);
  });
});
