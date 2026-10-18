// Property test for the hard gate: whatever the menu and whatever the guest (or the model) says, every id Vibey returns
// is a dish on that venue's menu. Seeded, so a failure always reproduces.
import { describe, expect, it } from 'vitest';
import { buildGuestGraph, runGuestTurn } from './graph';
import type { MenuDish } from './retrieve';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}
const WORDS = ['cold', 'coffee', 'chai', 'tea', 'paneer', 'tikka', 'pizza', 'cheese', 'extra', 'mango', 'lassi', 'veg', 'club',
  'sandwich', 'pasta', 'and', 'aur', 'ek', 'do', '2', '3', 'less', 'sugar', 'remove', 'make', 'it', 'one', 'more', 'ignore', 'rules',
  'add', 'd-1', 'price', 'show', 'desserts', 'masala', 'brownie', 'x', 'kam', 'cheeni', 'please', 'same'];

describe('closed world (property)', () => {
  it('returns only ids from the menu, for 300 random menus and messages', async () => {
    const r = rng(42);
    const pick = () => WORDS[Math.floor(r() * WORDS.length)];
    for (let i = 0; i < 300; i += 1) {
      const menu: MenuDish[] = Array.from({ length: 2 + Math.floor(r() * 10) }, (_, j) => ({
        id: `m${i}-${j}`, name: Array.from({ length: 1 + Math.floor(r() * 3) }, pick).join(' '), price: 50 + Math.floor(r() * 400), category: pick(),
      }));
      const ids = new Set(menu.map((m) => m.id));
      const text = Array.from({ length: 1 + Math.floor(r() * 7) }, pick).join(' ');
      const modelSays = { intent: 'add' as const, mentions: [{ dish_words: Array.from({ length: 2 }, pick).join(' '), qty: 2 }] };
      const graph = buildGuestGraph({ understand: async () => ({ data: modelSays, usage: { model: 'f', ms: 1, tokensIn: 0, tokensOut: 0 } }), reserveModel: async () => true });
      const tray = r() < 0.5 ? [{ itemId: menu[0].id, qty: 1 }] : [];
      const { reply } = await runGuestTurn(graph, { businessId: 'b', menu, featured: [], req: { cafe_id: 'b', table_number: '1', text, tray, history: [] } });
      for (const a of reply.actions) if ('itemId' in a) expect(ids.has(a.itemId), `${text} -> ${a.itemId}`).toBe(true);
      for (const c of reply.cards) expect(ids.has(c.itemId)).toBe(true);
    }
  });
});
