import { describe, it, expect } from 'vitest';
import { kindOf, suggestForCart, type SuggestableDish } from './cart-suggestions';

const d = (id: string, name: string, category: string, extra: Partial<SuggestableDish> = {}): SuggestableDish => ({ id, name, price: 100, category, ...extra });
const menu = [
  d('burger', 'Veg Burger', 'Burgers'),
  d('fries', 'Peri Peri Fries', 'Quick Bites'),
  d('shake', 'Oreo Shake', 'Shakes'),
  d('tea', 'Cardamom Tea', 'Beverages'),
  d('cola', 'Cola', 'Beverages'),
  d('cake', 'Chocolate Cake', 'Desserts'),
  d('custom', 'Build Your Pizza', 'Beverages', { customization_groups: [{}] }),
  d('gone', 'Sold-out Juice', 'Beverages', { available: false }),
  d('room', 'Deluxe Room', 'Rooms', { type: 'accommodation' }),
];
const inCart = (id: string, category: string) => ({ item_id: id, category });

describe('what kind of dish it is', () => {
  it('reads the category first, then the type, then the name', () => {
    expect(kindOf({ category: 'Shakes' })).toBe('beverage');
    expect(kindOf({ category: 'Desserts' })).toBe('dessert');
    expect(kindOf({ category: 'Quick Bites' })).toBe('side');
    expect(kindOf({ category: 'Burgers' })).toBe('main');
    expect(kindOf({ category: '', type: 'drink' })).toBe('beverage');
    expect(kindOf({ category: '', name: 'Masala Chai' })).toBe('beverage');
  });
});

describe('suggestions in the order review', () => {
  it('suggests nothing for an empty order', () => {
    expect(suggestForCart([], menu)).toEqual([]);
  });

  it('a food order with no drink is offered drinks, something sweet and a side', () => {
    const out = suggestForCart([inCart('burger', 'Burgers')], menu);
    expect(out.map((s) => s.id)).toEqual(['drinks', 'sweet', 'pairs']);
    expect(out[0].items.map((i) => i.id)).toEqual(['shake', 'tea', 'cola']);
    expect(out[1].items.map((i) => i.id)).toEqual(['cake']);
    expect(out[2].items.map((i) => i.id)).toEqual(['fries']);
  });

  it('leaves out what is already ordered, what is not available, rooms, and dishes that need a choice first', () => {
    const ids = suggestForCart([inCart('burger', 'Burgers'), inCart('shake', 'Shakes')], menu).flatMap((s) => s.items.map((i) => i.id));
    expect(ids).not.toContain('shake');
    expect(ids).not.toContain('gone');
    expect(ids).not.toContain('room');
    expect(ids).not.toContain('custom');
  });

  it('does not ask for a drink when the order already has one', () => {
    const out = suggestForCart([inCart('burger', 'Burgers'), inCart('tea', 'Beverages')], menu);
    expect(out.map((s) => s.id)).not.toContain('drinks');
  });

  it('puts the venue\'s own top picks first', () => {
    const out = suggestForCart([inCart('burger', 'Burgers')], menu, ['cola']);
    expect(out[0].items[0].id).toBe('cola');
  });

  it('an order of only drinks is offered something to eat with them', () => {
    const out = suggestForCart([inCart('shake', 'Shakes')], menu);
    expect(out.map((s) => s.id)).toEqual(['pairs']);
    expect(out[0].items.map((i) => i.id)).toEqual(['burger', 'fries']);
  });
});
