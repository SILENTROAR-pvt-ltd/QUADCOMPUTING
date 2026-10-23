// The conversations a real guest had with Vibey on a large menu (sizes, styles, saved diets), replayed on rules alone (the
// model is off): each one used to go wrong. Every reply must also stay inside the menu (closed world).
import { describe, expect, it } from 'vitest';
import { buildGuestGraph, runGuestTurn } from './graph';
import { LlmError } from '../core/llm';
import type { MenuDish } from './retrieve';
import type { VibeyContext } from './schema';

const d = (id: string, name: string, price: number, category: string, dietary: string, description = ''): MenuDish => ({ id, name, price, category, dietary, description });
const MENU: MenuDish[] = [
  d('bc-h', 'Butter Chicken (Half)', 330, 'Non Veg', 'non_veg'), d('bc-f', 'Butter Chicken (Full)', 620, 'Non Veg', 'non_veg'),
  d('ec-h', 'Egg Curry (Half)', 140, 'Non Veg', 'egg'),
  d('cc-d', 'Chilly Chicken (Dry)', 280, 'Starter', 'non_veg'), d('cc-g', 'Chilly Chicken (Gravy)', 320, 'Starter', 'non_veg'),
  d('cp-d', 'Chilly Paneer (Dry)', 280, 'Starter', 'veg'), d('pt', 'Paneer Tikka', 260, 'Tandoor', 'veg'),
  d('gn', 'Garlic Naan', 70, 'Breads', 'veg'), d('bn', 'Butter Naan', 60, 'Breads', 'veg'), d('jr', 'Jeera Rice', 130, 'Rice', 'veg'),
  d('br', 'Boondi Raita', 110, 'Curd', 'veg'),
  d('cm-s', 'Chicken Momos (Steamed)', 220, 'Momos', 'non_veg'), d('cm-f', 'Chicken Momos (Fried)', 240, 'Momos', 'non_veg'),
  d('vm-s', 'Veg. Momos (Steamed)', 140, 'Momos', 'veg'), d('vm-f', 'Veg. Momos (Fried)', 150, 'Momos', 'veg'),
  d('pm-s', 'Paneer Momos (Steamed)', 180, 'Momos', 'veg'),
  d('cof', 'Cold Coffee', 160, 'Cold Beverages', 'veg', 'Chilled coffee blended with milk.'), d('mgs', 'Mango Shake', 190, 'Cold Beverages', 'veg'),
  d('mt', 'Masala Tea', 60, 'Beverages', 'veg'), d('oj', 'Orange Juice', 170, 'Natural Juices', 'veg'),
  d('fbp', 'Fungi Baked Pasta', 310, 'Baked Pasta', 'veg', 'Mushroom pasta baked under cheese.'),
  d('ccbp', 'Cheese Chicken Baked Pasta', 380, 'Baked Pasta', 'non_veg'), d('mar', 'Margherita', 370, 'Pizza', 'veg', 'Tomato sauce, mozzarella and basil.'),
  d('httq', 'Hello to the Queen', 210, 'Sweet', 'veg'), d('bwic', 'Brownie with Ice Cream', 220, 'Sweet', 'egg'),
  d('pe', 'Poached Egg', 80, 'Breakfast', 'egg'), d('mfc', 'Muesli Fruit Curd', 120, 'Breakfast', 'veg'),
  d('ts', 'Tomato Soup', 120, 'Soups', 'veg'), d('hns', 'Hot n Sour Soup', 130, 'Soups', 'veg'),
  d('gb', 'Garlic Bread', 150, 'Quick Bites', 'veg'), d('tr', 'Tandoori Roti', 25, 'Breads', 'veg'), d('vhn', 'Veg Hakka Noodles', 180, 'Chinese', 'veg'),
];
const byId = new Map(MENU.map((m) => [m.id, m]));
const graph = buildGuestGraph({
  understand: async () => { throw new LlmError('no_key', 'offline'); },
  reserveModel: async () => true,
  loadEvents: async () => [{ title: 'Sufi Night', starts_at: '2026-10-25T14:30:00Z', entry_fee: 0, is_live_now: false, spots_left: 12 }],
});
async function say(text: string, tray: Array<{ itemId: string; qty: number }> = [], context?: VibeyContext) {
  const { reply } = await runGuestTurn(graph, { businessId: 'v', menu: MENU, featured: [], hour: 20, req: { cafe_id: 'v', table_number: 'T-01', text, tray, history: [], ...(context ? { context } : {}) } });
  for (const a of reply.actions) if ('itemId' in a) expect(byId.has(a.itemId)).toBe(true);
  for (const c of reply.cards) expect(byId.has(c.itemId)).toBe(true);
  return reply;
}
const cardNames = (r: { cards: { itemId: string }[] }) => r.cards.map((c) => byId.get(c.itemId)!.name);

describe('Vibey conversations on a real-sized menu', () => {
  it('suggests spicy non-veg dishes, never egg dishes', async () => {
    const r = await say('something spicy non veg');
    expect(cardNames(r).length).toBeGreaterThan(0);
    expect(r.cards.every((c) => byId.get(c.itemId)!.dietary === 'non_veg')).toBe(true);
    expect(cardNames(r)[0]).toMatch(/Chilly Chicken/);
  });

  it('"make it half instead" switches the size and keeps the quantity', async () => {
    const r = await say('make it half instead', [{ itemId: 'bc-f', qty: 2 }], { shown: [], pending: null, last: 'bc-f' });
    expect(r.actions).toEqual([{ type: 'remove', itemId: 'bc-f' }, { type: 'add', itemId: 'bc-h', qty: 2 }]);
  });

  it('knows what goes with a curry', async () => {
    const r = await say('what goes well with it', [{ itemId: 'bc-h', qty: 1 }]);
    expect(r.meta.intent).toBe('pair');
    expect(cardNames(r).some((n) => /Naan|Rice|Raita/.test(n))).toBe(true);
    expect(cardNames(r).some((n) => /Butter Chicken/.test(n))).toBe(false);
  });

  it('answers a diet question from the venue’s own mark', async () => {
    const r = await say('is hello to the queen veg?');
    expect(r.reply).toMatch(/^Yes, Hello to the Queen is vegetarian/);
    expect(r.actions.some((a) => a.type === 'call_staff')).toBe(false);
  });

  it('reads "kuch thanda pila do" as a wish for a cold drink', async () => {
    const r = await say('kuch thanda pila do');
    expect(cardNames(r).length).toBeGreaterThan(0);
    expect(cardNames(r).every((n) => /Cold Coffee|Mango Shake|Orange Juice/.test(n))).toBe(true);
  });

  it('tells the tray total from menu prices', async () => {
    const r = await say('how much is my total?', [{ itemId: 'bc-h', qty: 2 }, { itemId: 'gn', qty: 1 }]);
    expect(r.meta.intent).toBe('tray_total');
    expect(r.reply).toContain('₹730');
  });

  it('keeps a price limit and a kind', async () => {
    const r = await say('suggest a drink under 150');
    expect(r.cards.length).toBeGreaterThan(0);
    expect(r.cards.every((c) => byId.get(c.itemId)!.price <= 150)).toBe(true);
  });

  it('finds pasta with mushroom, not chicken pasta', async () => {
    const r = await say('do you have pasta with mushroom');
    expect(cardNames(r)).toContain('Fungi Baked Pasta');
    expect(cardNames(r)).not.toContain('Cheese Chicken Baked Pasta');
  });

  it('"2 momos" asks which momos, and the answer keeps the 2', async () => {
    const first = await say('2 momos');
    expect(first.reply).toMatch(/Which momo/i);
    expect(first.meta.context?.pending?.qty).toBe(2);
    const second = await say('steamed veg', [], first.meta.context);
    expect(second.actions).toEqual([{ type: 'add', itemId: 'vm-s', qty: 2 }]);
  });

  it('clears the tray when asked, and only then', async () => {
    const r = await say('cancel everything', [{ itemId: 'bc-h', qty: 1 }, { itemId: 'gn', qty: 2 }]);
    expect(r.actions.map((a) => a.type)).toEqual(['remove', 'remove']);
    const keep = await say('remove everything except the naan', [{ itemId: 'bc-h', qty: 1 }, { itemId: 'gn', qty: 2 }]);
    expect(keep.actions).toEqual([]);
  });

  it('says yes to a dish asked for by name', async () => {
    const r = await say('do you have margherita pizza');
    expect(r.reply).toMatch(/^Yes! Margherita is ₹370/);
    expect(cardNames(r)).toEqual(['Margherita']);
  });

  it('lists the venue’s events', async () => {
    const r = await say('any events today?');
    expect(r.meta.intent).toBe('events');
    expect(r.reply).toContain('Sufi Night');
  });

  it('recommends a spread of dishes, not one (a description word is never read as an ingredient)', async () => {
    const r = await say('what do you recommend?');
    expect(r.cards.length).toBeGreaterThanOrEqual(4);
  });

  it('pairs without repeating a kind the tray has, never breakfast curd as raita, and veg with veg', async () => {
    const curry = await say('what goes well with it', [{ itemId: 'bc-h', qty: 1 }, { itemId: 'gn', qty: 2 }]);
    expect(cardNames(curry).some((n) => /Naan/.test(n))).toBe(false);
    expect(cardNames(curry)).not.toContain('Muesli Fruit Curd');
    expect(cardNames(curry).some((n) => /Jeera Rice|Boondi Raita/.test(n))).toBe(true);
    const veg = await say('what goes well with it', [{ itemId: 'vm-s', qty: 2 }]);
    expect(veg.cards.every((c) => ['veg', 'vegan'].includes(String(byId.get(c.itemId)!.dietary)))).toBe(true);
  });

  it('never pairs a soup with roti or naan: garlic bread or a starter, and Chinese with a Chinese soup', async () => {
    const tomato = await say('what goes well with it', [{ itemId: 'ts', qty: 1 }]);
    expect(cardNames(tomato).some((n) => /Roti|Naan/.test(n))).toBe(false);
    expect(cardNames(tomato)).toContain('Garlic Bread');
    const added = await say('add a tomato soup');
    expect(added.chips.some((c) => /Roti|Naan|Rice/.test(c))).toBe(false);
    const sour = await say('what goes well with it', [{ itemId: 'hns', qty: 1 }]);
    expect(cardNames(sour).some((n) => /Momos|Chilly Paneer|Hakka Noodles/.test(n))).toBe(true);
    expect(cardNames(sour).some((n) => /Roti|Naan/.test(n))).toBe(false);
  });

  it('pairs a dry starter with a drink and a curry, not a bread', async () => {
    const r = await say('what goes well with paneer tikka');
    expect(cardNames(r).some((n) => /Roti|Naan/.test(n))).toBe(false);
    expect(r.cards.length).toBeGreaterThan(0);
  });

  it('asks like a waiter before planning a table’s meal: veg or non-veg, then the craving, then the spread', async () => {
    const diet = await say('dinner for 4');
    expect(diet.meta.intent).toBe('plan');
    expect(diet.reply).toBe('Dinner for 4, lovely. Veg or non-veg?');
    expect(diet.chips).toEqual(['Veg', 'Non-veg', 'Both']);
    expect(diet.cards).toEqual([]);
    const craving = await say('Veg', [], diet.meta.context);
    expect(craving.reply).toBe('Noted, all veg. Any cravings?');
    expect(craving.chips.at(-1)).toBe('You choose');
    const plan = await say(craving.chips[0], [], craving.meta.context);
    expect(plan.reply).toMatch(/^Here’s a spread for 4, about ₹[\d,]+ in all:\n• \d+ × /);
    expect(plan.cards.every((c) => ['veg', 'vegan'].includes(String(byId.get(c.itemId)!.dietary)))).toBe(true);
    expect(plan.cards.some((c) => byId.get(c.itemId)!.category === craving.chips[0])).toBe(true);
    expect(plan.chips[0]).toBe('Add the whole spread');
    expect(plan.meta.context?.planAsk).toBeUndefined();
    const add = await say('Add the whole spread', [], plan.meta.context);
    expect(add.actions.map((a) => 'itemId' in a && a.itemId)).toEqual(plan.meta.context!.plan!.map((p) => p.id));
  });

  it('skips a question the guest already answered, and keeps "non-veg" to the starter and mains', async () => {
    expect((await say('hum do log hain, veg please')).reply).toBe('A table for 2, all veg, lovely. Any cravings?');
    const craving = await say('non veg dinner for 2');
    expect(craving.reply).toBe('Non-veg dinner for 2, lovely. Any cravings?');
    const plan = await say('You choose', [], craving.meta.context);
    expect(plan.cards.some((c) => byId.get(c.itemId)!.dietary === 'non_veg')).toBe(true);
    expect(plan.cards.some((c) => /Beverages|Juices/.test(byId.get(c.itemId)!.category ?? ''))).toBe(true);
  });

  it('keeps a table budget through the questions, and still orders "butter chicken for 2 people"', async () => {
    const diet = await say('meal for 2 under 700');
    expect(diet.reply).toBe('Meal for 2, lovely. Veg or non-veg?');
    const craving = await say('Both', [], diet.meta.context);
    const plan = await say('You choose', [], craving.meta.context);
    expect(plan.cards.reduce((s, c, i) => s + byId.get(c.itemId)!.price * plan.meta.context!.plan![i].qty, 0)).toBeLessThanOrEqual(700);
    const order = await say('butter chicken full for 2 people');
    expect(order.meta.intent).not.toBe('plan');
  });

  it('understands hunger, "show more", the bill and "what can you do"', async () => {
    expect((await say('bhook lagi hai')).cards.length).toBeGreaterThanOrEqual(3);
    const drinks = await say('suggest a drink');
    const more = await say('show more', [], drinks.meta.context);
    expect(more.cards.some((c) => drinks.cards.some((x) => x.itemId === c.itemId))).toBe(false);
    expect(more.cards.every((c) => /Beverages|Juices/.test(byId.get(c.itemId)!.category ?? ''))).toBe(true);
    const bill = await say('bill please');
    expect(bill.actions).toEqual([{ type: 'call_staff', reason: 'bill' }]);
    expect((await say('what can you do?')).reply).toMatch(/plan a meal/);
  });

  it('suggests something to go with a dish it just added, with the running total', async () => {
    const r = await say('add 1 butter chicken full');
    expect(r.actions).toEqual([{ type: 'add', itemId: 'bc-f', qty: 1 }]);
    expect(r.reply).toContain('Your tray: 1 dish · ₹620.');
    expect(r.chips.some((c) => /^Add (Butter Naan|Garlic Naan|Jeera Rice|Boondi Raita)/.test(c))).toBe(true);
  });
});
