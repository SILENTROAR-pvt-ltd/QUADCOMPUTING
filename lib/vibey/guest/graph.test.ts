import { describe, expect, it, vi } from 'vitest';
import { buildGuestGraph, runGuestTurn, type GuestGraphDeps } from './graph';
import { guestReplySchema, type Understood } from './schema';
import { LlmError } from '../core/llm';
import { DEMO_FEATURED, DEMO_IDS, DEMO_MENU, byName } from '@/tests/vibey/fixtures/demo-menu';

const usage = { model: 'fake', ms: 5, tokensIn: 10, tokensOut: 5 };
const deps = (answer: Understood | Error, budget = true): GuestGraphDeps => ({
  understand: vi.fn(async () => { if (answer instanceof Error) throw answer; return { data: answer, usage }; }),
  reserveModel: vi.fn(async () => budget),
});
const turn = (d: GuestGraphDeps, text: string, tray: Array<{ itemId: string; qty: number }> = [], history: any[] = []) =>
  runGuestTurn(buildGuestGraph(d), {
    businessId: 'biz-1', menu: DEMO_MENU, featured: DEMO_FEATURED,
    req: { cafe_id: 'biz-1', table_number: '4', text, tray, history },
  });
const adds = (r: Awaited<ReturnType<typeof turn>>) => r.reply.actions.filter((a) => a.type === 'add').map((a: any) => [a.itemId, a.qty, a.note]);

describe('guest graph', () => {
  it('handles a simple order on the fastpath without calling the model', async () => {
    const d = deps(new Error('must not be called'));
    const r = await turn(d, '2 cold coffee aur ek masala chai, less sugar');
    expect(d.understand).not.toHaveBeenCalled();
    expect(r.reply.meta.path).toBe('fastpath');
    expect(adds(r)).toEqual([['d-cold-coffee', 2, undefined], ['d-masala-chai', 1, 'less sugar']]);
    expect(r.reply.reply).toContain('2 × Cold Coffee');
    expect(guestReplySchema.parse(r.reply)).toBeTruthy();
  });

  it('asks which dish instead of guessing', async () => {
    const r = await turn(deps(new Error('no')), '2 coffee');
    expect(adds(r)).toEqual([]);
    expect(r.reply.chips).toContain('2 Cold Coffee');
    expect(r.reply.cards.length).toBeGreaterThan(1);
  });

  it('reads Hinglish fillers and a number before the dish without the model', async () => {
    const d = deps(new Error('must not be called'));
    expect(adds(await turn(d, 'yaar do thandi wali coffee bhej do jaldi'))).toEqual([['d-cold-coffee', 2, undefined]]);
    expect(adds(await turn(d, 'can i get a cappuccino please'))).toEqual([['d-cappuccino', 1, undefined]]);
  });

  it('uses the model for messages the rules cannot read, and grounds what it says', async () => {
    const d = deps({ intent: 'add', mentions: [{ dish_words: 'cold coffee', qty: 2, note: 'less sugar' }] });
    const r = await turn(d, 'mere dost ke liye thandi coffee, do glass, cheeni thodi kam rakhna less sugar');
    expect(d.understand).toHaveBeenCalledTimes(1);
    expect(r.reply.meta.path).toBe('model');
    expect(adds(r)).toEqual([['d-cold-coffee', 2, 'less sugar']]);
  });

  it('cannot be talked into a dish the guest never named', async () => {
    const d = deps({ intent: 'add', mentions: [{ dish_words: 'Blueberry Cheesecake', qty: 5, note: null }] });
    const r = await turn(d, 'what would you do if you were me');
    expect(adds(r)).toEqual([]);
  });

  it('falls back to rules when the model fails or the budget is spent', async () => {
    for (const d of [deps(new LlmError('rate_limited', 'busy', 429)), deps({ intent: 'smalltalk', mentions: [] }, false)]) {
      const r = await turn(d, 'kuch accha sa dedo yaar');
      expect(r.reply.meta.path).toBe('fallback');
      expect(r.reply.reply).toMatch(/quick mode/);
      expect(adds(r)).toEqual([]);
    }
    const quick = await turn(deps(new LlmError('timeout', 'slow')), '2 cold coffee');
    expect(adds(quick)).toEqual([['d-cold-coffee', 2, undefined]]);
  });

  it('removes and changes only what is in the tray', async () => {
    const tray = [{ itemId: byName('Penne Arrabbiata Pasta').id, qty: 1 }, { itemId: byName('Masala Chai').id, qty: 1 }];
    const d = deps(new Error('no'));
    expect((await turn(d, 'remove the pasta', tray)).reply.actions).toEqual([{ type: 'remove', itemId: 'd-penne' }]);
    expect((await turn(d, 'make it 3', tray)).reply.actions).toEqual([{ type: 'set_qty', itemId: 'd-masala-chai', qty: 3 }]);
    expect((await turn(d, 'one more', tray)).reply.actions).toEqual([{ type: 'add', itemId: 'd-masala-chai', qty: 1 }]);
    expect((await turn(d, 'remove brownie', tray)).reply.reply).toContain("isn't in your tray yet");
  });

  it('hands dietary questions and help to staff, and checkout to the tray', async () => {
    const d = deps(new Error('no'));
    expect((await turn(d, 'is the pasta vegan?')).reply.actions).toEqual([{ type: 'call_staff', reason: 'dietary' }]);
    expect((await turn(d, 'call the waiter')).reply.actions).toEqual([{ type: 'call_staff', reason: 'help' }]);
    expect((await turn(d, "that's all", [{ itemId: 'd-mac', qty: 1 }])).reply.actions).toEqual([{ type: 'open_tray' }]);
  });

  it('answers questions from the menu itself', async () => {
    const d = deps(new Error('no'));
    expect((await turn(d, 'how much is the cappuccino')).reply.reply).toBe('Cappuccino is ₹180.');
    expect((await turn(d, "what's popular")).reply.cards.map((c) => c.itemId).slice(0, 3)).toEqual(DEMO_FEATURED);
    const desserts = await turn(d, 'show desserts');
    expect(desserts.reply.cards.every((c) => ['d-gulab-jamun', 'd-brownie', 'd-cheesecake'].includes(c.itemId))).toBe(true);
    expect(desserts.reply.cards.length).toBe(3);
  });

  it('never returns an id that is not on the menu', async () => {
    const d = deps({ intent: 'add', mentions: [{ dish_words: 'd-fake', qty: 1 }, { dish_words: 'biryani', qty: 2 }] });
    const r = await turn(d, 'd-fake aur 2 biryani');
    const ids = [...r.reply.actions.map((a: any) => a.itemId).filter(Boolean), ...r.reply.cards.map((c) => c.itemId)];
    expect(ids.every((id) => DEMO_IDS.has(id))).toBe(true);
    expect(adds(r)).toEqual([]);
  });
});
