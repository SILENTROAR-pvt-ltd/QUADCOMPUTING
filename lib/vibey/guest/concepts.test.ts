import { describe, expect, it } from 'vitest';
import { conceptsOf, lexiconTermCount, matchBrowse, venueCategories } from './concepts';
import { browse } from './answers';
import { fastParse } from './fastpath';
import { DEMO_MENU } from '@/tests/vibey/fixtures/demo-menu';
import type { MenuDish } from './retrieve';

// A menu shaped like Bombay Rasoi's live menu: real category names, real dish names, no "Mains" or "Curry" category.
const d = (id: string, name: string, category: string): MenuDish => ({ id, name, price: 100, category });
const VENUE: MenuDish[] = [
  d('s1', 'Veg Club Sandwich', 'Sandwiches'), d('s2', 'Bread Butter Jam', 'Sandwiches'), d('s3', 'Mumbai Masala Toast Sandwich', 'Sandwiches'),
  d('q1', 'Vada Pav', 'Quick Bites'), d('q2', 'Misal Pav', 'Quick Bites'), d('q3', 'Peri Peri Fries', 'Quick Bites'),
  d('b1', 'Cutting Chai', 'Beverages'), d('b2', 'Cardamom Tea', 'Beverages'), d('b3', 'Coffee', 'Beverages'),
  d('sh1', 'Banana Milkshake', 'Shakes'), d('sh2', 'Mango Milk Shake', 'Shakes'),
  d('br1', 'Methi Thepla (3 Pcs)', 'Breads'), d('br2', 'Puri (3 Pcs)', 'Breads'),
  d('pb1', 'Spl Mumbai Pav Bhaji', 'Pav Bhaji'), d('pb2', 'Tawa Pulao', 'Pav Bhaji'),
  d('dl1', 'Dal Fry / Tadka', 'Dals & Lentils'), d('dl2', 'Dal Makhani', 'Dals & Lentils'), d('dl3', 'Gujarati Kadhi', 'Dals & Lentils'),
  d('w1', 'Chocolate Waffle', 'Waffles'), d('w2', 'Plain Waffle', 'Waffles'),
  d('bu1', 'Veg Burger', 'Burgers'), d('p1', 'Margarita Pizza', 'Pizza'), d('r1', 'Veg Roll', 'Rolls'), d('sa1', 'Garden Green Salad', 'Salads'),
];

const names = (topic: string, menu: MenuDish[]) => matchBrowse(topic, menu).dishes.map((x) => x.name);

describe('lexicon', () => {
  it('holds a training set of at least 1,000 food terms', () => {
    expect(lexiconTermCount()).toBeGreaterThanOrEqual(1000);
  });

  it('reads Hinglish, spelling variants and typos as the same concept', () => {
    expect(conceptsOf('thandi coffee').has('cold')).toBe(true);
    expect(conceptsOf('thandi coffee').has('coffee')).toBe(true);
    expect(conceptsOf('cappucino').has('coffee')).toBe(true);
    expect(conceptsOf('gulab jamoon').has('dessert')).toBe(true);
    expect(conceptsOf('chai').has('tea')).toBe(true);
    expect(conceptsOf('kuch meetha').has('dessert')).toBe(true);
  });
});

describe('browse by category, never by guess', () => {
  it('answers mains with the dishes that are mains, never sandwiches (the screenshot bug)', () => {
    const a = browse('indian main course', VENUE);
    expect(a.text).toMatch(/Here’s what we have for mains/);
    const shown = VENUE.filter((x) => a.cards.includes(x.id)).map((x) => x.category);
    expect(shown).not.toContain('Sandwiches');
    expect(shown).not.toContain('Burgers');
    expect(shown.length).toBeGreaterThan(0);
  });

  it('says what the venue does have when it has nothing for the request', () => {
    const a = browse('noodles', VENUE);
    expect(a.cards).toEqual([]);
    expect(a.text).toMatch(/We don’t have noodles on this menu/);
    expect(a.chips).toContain('Show Sandwiches');
  });

  it('finds the real dishes when the venue has them under other names', () => {
    const got = names('main course', VENUE);
    expect(got).toEqual(expect.arrayContaining(['Dal Fry / Tadka', 'Dal Makhani', 'Spl Mumbai Pav Bhaji', 'Tawa Pulao']));
    expect(got).not.toContain('Veg Club Sandwich');
    expect(got).not.toContain('Veg Burger');
  });

  it('matches a named category and its dishes', () => {
    expect(names('dal', VENUE).sort()).toEqual(['Dal Fry / Tadka', 'Dal Makhani', 'Gujarati Kadhi'].sort());
    expect(names('waffles', VENUE).sort()).toEqual(['Chocolate Waffle', 'Plain Waffle']);
    expect(names('pizza', VENUE)).toEqual(['Margarita Pizza']);
    expect(names('sandwich', VENUE)).toEqual(expect.arrayContaining(['Veg Club Sandwich']));
  });

  it('shows only cold drinks when the guest says thanda, if there are any', () => {
    const cold = matchBrowse('kuch thanda peena hai', VENUE);
    expect(cold.coldFirst).toBe(true);
    expect(cold.dishes.map((x) => x.name)).toEqual(['Banana Milkshake', 'Mango Milk Shake']);
  });

  it('a dish takes its venue category over words in its name (a paneer grill sandwich is not a main)', () => {
    const grill = d('g1', 'Paneer Makhni Grill Sandwich', 'Sandwiches');
    const roll = d('g2', 'Paneer Makhni Roll', 'Rolls');
    expect(matchBrowse('main course', [grill, roll]).dishes).toEqual([]);
    expect(matchBrowse('sandwich', [grill, roll]).dishes.map((x) => x.id)).toEqual(['g1']);
  });

  it('keeps methi (fenugreek) as bread, not a sweet', () => {
    expect(names('bread', VENUE)).toEqual(expect.arrayContaining(['Methi Thepla (3 Pcs)']));
    expect(names('dessert', VENUE)).not.toContain('Methi Thepla (3 Pcs)');
  });

  it('keeps the demo menu answers (desserts, sweet, drinks)', () => {
    expect(names('show desserts', DEMO_MENU)).toEqual(expect.arrayContaining(['Gulab Jamun', 'Chocolate Brownie']));
    expect(names('something sweet', DEMO_MENU)).toEqual(expect.arrayContaining(['Gulab Jamun']));
    expect(names('drinks', DEMO_MENU)).toEqual(expect.arrayContaining(['Cold Coffee']));
  });

  it('routes the exact screenshot message to browse on the venue menu', () => {
    expect(fastParse('INDIAN MAIN COURSE', VENUE)).toMatchObject({ intent: 'browse' });
  });

  it('lists what the venue actually has, most dishes first', () => {
    expect(venueCategories(VENUE, 3)[0]).toBe('Sandwiches');
  });
});
