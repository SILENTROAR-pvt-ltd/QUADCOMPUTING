// Answering in the guest's language: which language a message is in (rules, no model), and the translation step, which
// may reword Vibey's reply but can never change a dish name or a price.
import { describe, expect, it, vi } from 'vitest';
import { detectLang, replyLang } from './language';
import { localiseReply, type Translate } from './localise';
import { buildGuestGraph, runGuestTurn } from './graph';
import { LlmError } from '../core/llm';
import type { MenuDish } from './retrieve';
import type { VibeyGuestReply } from './schema';

const MENU: MenuDish[] = [
  { id: 'cc', name: 'Cold Coffee', price: 160, category: 'Cold Beverages', dietary: 'veg' },
  { id: 'c', name: 'Coffee', price: 50, category: 'Beverages', dietary: 'veg' },
  { id: 'bw', name: 'Brownie with Ice Cream', price: 220, category: 'Sweet', dietary: 'egg' },
];
const usage = { model: 'fake', ms: 5, tokensIn: 10, tokensOut: 10 };
const reply = (text: string, chips: string[] = []): VibeyGuestReply => ({ reply: text, actions: [], cards: [], chips, meta: { path: 'fastpath', ms: 1, intent: 'browse' } });
/** A "translator" that marks every word it was given, keeping the tokens: a stand-in for the model. */
const echo: Translate = async ({ user }) => {
  const { text, chips } = JSON.parse(user);
  const tr = (s: string) => s.replace(/[A-Za-z]+/g, (w) => `ת${w}`);
  return { data: { text: tr(text), chips: chips.map(tr) }, usage };
};

describe('which language the guest writes in', () => {
  it('reads the writing system and the everyday words of common languages', () => {
    expect(detectLang('אפשר משהו קר לשתות?')).toBe('he');
    expect(detectLang('मुझे कुछ ठंडा चाहिए')).toBe('hi');
    expect(detectLang('je voudrais un café s’il vous plait')).toBe('fr');
    expect(detectLang('quiero algo para beber por favor')).toBe('es');
    expect(detectLang('something spicy please')).toBe('en');
    expect(detectLang('kuch thanda chahiye')).toBe('en');
    expect(detectLang('2 momos')).toBeNull();
  });

  it('keeps the conversation’s language for a tapped suggestion or a message too short to tell', () => {
    const context = { shown: [], pending: null, last: null, lang: 'he' };
    expect(replyLang({ text: 'What goes well with it?', chip: true, context })).toBe('he');
    expect(replyLang({ text: '2 momos', context })).toBe('he');
    expect(replyLang({ text: 'something spicy please', context })).toBe('en');
  });
});

describe('translating a reply', () => {
  it('translates the words but puts every dish name and price back exactly', async () => {
    const r = await localiseReply(reply('Here are some drinks: Cold Coffee ₹160 · Coffee ₹50', ['Add Cold Coffee', 'Show desserts']), 'he', MENU, echo);
    expect(r.reply.reply).toBe('תHere תare תsome תdrinks: Cold Coffee ₹160 · Coffee ₹50');
    expect(r.reply.chips).toEqual(['Add Cold Coffee', 'Show desserts']);
    expect(r.reply.chip_labels).toEqual(['תAdd Cold Coffee', 'תShow תdesserts']);
  });

  it('keeps the English when the translation loses a dish, or the model fails, and never calls it for English', async () => {
    const lossy: Translate = async () => ({ data: { text: 'something else', chips: [] }, usage });
    const original = reply('Cold Coffee is ₹160.');
    expect((await localiseReply(original, 'he', MENU, lossy)).reply).toBe(original);
    const broken: Translate = async () => { throw new LlmError('timeout', 'slow'); };
    expect((await localiseReply(original, 'fr', MENU, broken)).reply).toBe(original);
    const spy = vi.fn(echo);
    expect((await localiseReply(original, 'en', MENU, spy)).reply).toBe(original);
    expect(spy).not.toHaveBeenCalled();
  });

  it('answers a Hebrew message in Hebrew and remembers the language for the next turn', async () => {
    const graph = buildGuestGraph({
      understand: async () => ({ data: { intent: 'browse', topic: 'cold drink', mentions: [] }, usage }),
      reserveModel: async () => true,
      translate: echo,
    });
    const { reply: r } = await runGuestTurn(graph, { businessId: 'v', menu: MENU, featured: [], req: { cafe_id: 'v', table_number: 'T-01', text: 'אפשר משהו קר לשתות?', tray: [], history: [] } });
    expect(r.reply.startsWith('ת')).toBe(true);
    expect(r.meta.context?.lang).toBe('he');
    expect(r.chip_labels?.length).toBe(r.chips.length);
  });
});
