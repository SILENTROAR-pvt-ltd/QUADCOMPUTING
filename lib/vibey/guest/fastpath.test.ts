import { describe, expect, it } from 'vitest';
import { fastParse, SAME_AS_LAST } from './fastpath';
import { DEMO_MENU } from '@/tests/vibey/fixtures/demo-menu';

const parse = (t: string) => fastParse(t, DEMO_MENU);

describe('fastpath rule parser', () => {
  it('reads quantities, several dishes and Hinglish joiners', () => {
    expect(parse('2 cold coffee')).toEqual({ intent: 'add', mentions: [{ dish_words: 'cold coffee', qty: 2, note: null }] });
    const two = parse('2 cold coffee aur ek masala chai');
    expect(two?.mentions.map((m) => [m.dish_words, m.qty])).toEqual([['cold coffee', 2], ['masala chai', 1]]);
    expect(parse('do cappuccino and a brownie')?.mentions.map((m) => m.qty)).toEqual([2, 1]);
    expect(parse('cold coffee x3')?.mentions[0].qty).toBe(3);
    expect(parse('masala chai do')?.mentions[0]).toMatchObject({ dish_words: 'masala chai do', qty: null });
  });

  it('keeps kitchen notes with the dish they belong to', () => {
    expect(parse('2 masala chai less sugar')?.mentions[0]).toMatchObject({ dish_words: 'masala chai', qty: 2, note: 'less sugar' });
    expect(parse('2 cold coffee, less sugar')?.mentions[0]).toMatchObject({ dish_words: 'cold coffee', note: 'less sugar' });
    expect(parse('ek chai cheeni kam')?.mentions[0]).toMatchObject({ dish_words: 'chai', note: 'cheeni kam' });
  });

  it('keeps note words that are part of a dish name', () => {
    expect(parse('1 extra cheese pizza')?.mentions[0]).toMatchObject({ dish_words: 'extra cheese pizza', note: null });
    expect(parse('mac and cheese')?.mentions).toHaveLength(1);
  });

  it('reads remove, change and one-more', () => {
    expect(parse('remove the pasta')).toMatchObject({ intent: 'remove', mentions: [{ dish_words: 'the pasta' }] });
    expect(parse('pasta hatao')).toMatchObject({ intent: 'remove' });
    expect(parse('make it 3')).toMatchObject({ intent: 'set_qty', mentions: [{ dish_words: SAME_AS_LAST, qty: 3 }] });
    expect(parse('change masala chai to 2')).toMatchObject({ intent: 'set_qty', mentions: [{ dish_words: 'masala chai', qty: 2 }] });
    expect(parse('one more')).toMatchObject({ intent: 'add', mentions: [{ dish_words: SAME_AS_LAST, qty: 1 }] });
  });

  it('recognises questions, staff calls, checkout and greetings', () => {
    expect(parse("what's popular?")).toMatchObject({ intent: 'ask', question: 'popular' });
    expect(parse('how much is cold coffee')).toMatchObject({ intent: 'ask', question: 'price', topic: 'cold coffee' });
    expect(parse('show desserts')).toMatchObject({ intent: 'browse', topic: 'desserts' });
    expect(parse('is the paneer tikka spicy?')).toMatchObject({ intent: 'ask', question: 'dietary' });
    expect(parse('I am allergic to nuts')).toMatchObject({ intent: 'ask', question: 'dietary' });
    expect(parse('call the waiter')).toMatchObject({ intent: 'call_staff' });
    expect(parse("that's all")).toMatchObject({ intent: 'checkout' });
    expect(parse('hello')).toMatchObject({ intent: 'smalltalk' });
  });

  it('hands open questions to the model', () => {
    expect(parse('why is the coffee late')).toBeNull();
    expect(parse('something cold to drink')).not.toBeNull();
  });
});
