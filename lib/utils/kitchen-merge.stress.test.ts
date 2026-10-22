import { describe, it, expect } from 'vitest';
import { mergeTicket, mergeTickets } from './kitchen-merge';

// A kitchen or waiter screen in a rush, replayed many times with a seeded random clock: 36 tickets move through their
// stages; the screen hears each move by push (late, out of order, some lost) and reads the whole list now and then
// (each read is a snapshot from when it was sent, and the answers come back in any order). The screen applies them the
// way use-kitchen-realtime does: an answer older than one already shown is dropped, and every list is merged forward-only.
const STAGES = ['PENDING', 'PREPARING', 'READY', 'SERVED'] as const;
const RANK: Record<string, number> = { PENDING: 0, PREPARING: 1, READY: 2, SERVED: 3 };

function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
}
const ticket = (id: string, status: string) => ({ id, ticket_number: id, table_or_room: 'T', items: [], status, created_at: '', status_history: [] }) as any;

function replay(seed: number, naive = false) {
  const r = rng(seed);
  // The old screen: every list answer replaced what was shown, and every push was taken as it came.
  const keep = naive ? (_shown: any, incoming: any) => incoming : mergeTicket;
  const keepAll = naive ? (_shown: any[], incoming: any[]) => incoming : mergeTickets;
  const ids = Array.from({ length: 36 }, (_, i) => `t${i}`);
  const truth = new Map(ids.map((id) => [id, 0]));
  const events: Array<{ at: number; run: () => void }> = [];
  let shown = ids.map((id) => ticket(id, 'PENDING'));
  let shownSeq = 0;
  let seq = 0;
  const seen = new Map(ids.map((id) => [id, 0]));
  let regressions = 0;
  const observe = () => shown.forEach((t) => {
    const k = RANK[t.status];
    if (k < (seen.get(t.id) ?? 0)) regressions++;
    seen.set(t.id, Math.max(seen.get(t.id) ?? 0, k));
  });

  // The kitchen moves every ticket through its stages at random moments over 3 s.
  for (const id of ids) {
    let at = r() * 300;
    for (let s = 1; s < STAGES.length; s++) {
      at += 50 + r() * 900;
      const stage = s;
      events.push({ at, run: () => {
        truth.set(id, stage);
        // The push naming the stage arrives 20-400 ms later; one in ten is lost.
        if (r() > 0.1) events.push({ at: at + 20 + r() * 380, run: () => {
          const cur = shown.find((t) => t.id === id);
          if (!cur) return;
          const moved = keep(cur, { ...cur, status: STAGES[stage] });
          shown = shown.map((t) => (t.id === id ? moved : t));
          observe();
        } });
      } });
    }
  }
  // Reads of the whole list every 100-250 ms, each answered 30-700 ms later.
  for (let at = 0; at < 4200; at += 100 + r() * 150) {
    const sendAt = at;
    events.push({ at: sendAt, run: () => {
      const mySeq = ++seq;
      const snapshot = ids.map((id) => ticket(id, STAGES[truth.get(id)!]));
      events.push({ at: sendAt + 30 + r() * 670, run: () => {
        if (!naive && mySeq < shownSeq) return;
        shownSeq = mySeq;
        shown = keepAll(shown, snapshot);
        observe();
      } });
    } });
  }
  // A last read after everything settles.
  events.push({ at: 6000, run: () => { shown = keepAll(shown, ids.map((id) => ticket(id, STAGES[truth.get(id)!]))); observe(); } });

  while (events.length) {
    events.sort((a, b) => a.at - b.at);
    events.shift()!.run();
  }
  const wrong = shown.filter((t) => RANK[t.status] !== truth.get(t.id)).length;
  return { regressions, wrong };
}

describe('a kitchen screen in a rush', () => {
  it('never shows a ticket going backwards and ends on the true state, over 300 replays', () => {
    let regressions = 0;
    let wrong = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const r = replay(seed);
      regressions += r.regressions;
      wrong += r.wrong;
    }
    expect(regressions).toBe(0);
    expect(wrong).toBe(0);
  });

  it('the old screen, fed the same rushes, does flip tickets back: the replay catches the bug it guards against', () => {
    let regressions = 0;
    for (let seed = 1; seed <= 50; seed++) regressions += replay(seed, true).regressions;
    expect(regressions).toBeGreaterThan(0);
  });
});
