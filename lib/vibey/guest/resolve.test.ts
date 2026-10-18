import { describe, expect, it } from 'vitest';
import { resolveInTray, resolveMention } from './resolve';
import { DEMO_MENU, byName } from '@/tests/vibey/fixtures/demo-menu';

const ok = (phrase: string) => {
  const r = resolveMention(phrase, DEMO_MENU);
  return r.status === 'ok' ? r.dish.name : r.status;
};

describe('closed-world resolver', () => {
  it('accepts exact names, Hinglish aliases and typos', () => {
    expect(ok('cold coffee')).toBe('Cold Coffee');
    expect(ok('Masala Chai')).toBe('Masala Chai');
    expect(ok('masala tea')).toBe('Masala Chai');
    expect(ok('thandi coffee')).toBe('Cold Coffee');
    expect(ok('capuccino')).toBe('Cappuccino');
    expect(ok('cappucino')).toBe('Cappuccino');
    expect(ok('mango lasi')).toBe('Mango Lassi');
    expect(ok('nimbu soda')).toBe('Fresh Lime Soda');
    expect(ok('mac and cheese')).toBe('Mac and Cheese');
    expect(ok('extra cheese pizza')).toBe('Extra Cheese Pizza');
  });

  it('accepts a partial name when only one dish fits every word', () => {
    expect(ok('pasta')).toBe('Penne Arrabbiata Pasta');
    expect(ok('brownie')).toBe('Chocolate Brownie');
    expect(ok('paratha')).toBe('Aloo Paratha');
    expect(ok('lassi')).toBe('Mango Lassi');
  });

  it('asks instead of guessing when several dishes fit', () => {
    const coffee = resolveMention('coffee', DEMO_MENU);
    expect(coffee.status).toBe('ambiguous');
    if (coffee.status === 'ambiguous') expect(coffee.options.length).toBeGreaterThan(1);
    expect(resolveMention('tea', DEMO_MENU).status).toBe('ambiguous');
    expect(resolveMention('club sandwich', DEMO_MENU).status).toBe('ambiguous');
    expect(resolveMention('pizza', DEMO_MENU).status).toBe('ambiguous');
  });

  it('never matches something the menu does not have', () => {
    expect(ok('biryani')).toBe('none');
    expect(ok('beer')).toBe('none');
    expect(ok('xyz')).toBe('none');
    expect(ok('')).toBe('none');
  });

  it('prefers the dish already in the tray when removing', () => {
    const r = resolveInTray('coffee', DEMO_MENU, [byName('Cold Coffee').id, byName('Masala Chai').id]);
    expect(r.status === 'ok' && r.dish.name).toBe('Cold Coffee');
    // Nothing in the tray fits: the whole menu is asked, which here is a choice.
    expect(resolveInTray('coffee', DEMO_MENU, [byName('Masala Chai').id]).status).toBe('ambiguous');
  });
});
