import { describe, expect, it } from 'vitest';
import { dietOf, dietRequest, dishesForDiet } from './diet';
import { browse, dietary } from './answers';
import { fastParse } from './fastpath';
import { resolveMention } from './resolve';
import { DEMO_MENU } from '@/tests/vibey/fixtures/demo-menu';
import type { MenuDish } from './retrieve';

const d = (id: string, name: string, category = 'Food', description = ''): MenuDish => ({ id, name, price: 100, category, description });
// The real failure: a menu with veg dishes named "Veg ..." and no meat at all.
const VEG_MENU = [d('vb', 'Veg Burger'), d('vcb', 'Veg Cheese Burger with Fries'), d('mp', 'Masala Pav'), d('ct', 'Cutting Chai', 'Beverages')];
const MIXED = [...VEG_MENU, d('cr', 'Chicken Roll'), d('eb', 'Egg Bhurji Pav'), d('fc', 'Fish Curry'), d('ek', 'Eggless Brownie', 'Desserts'),
  d('st', 'Special Thali', 'Mains', 'Rice, dal and butter chicken')];

describe('diet, decided by the menu', () => {
  it('reads meat, fish and egg from the dish text, and nothing else', () => {
    expect(dietOf(d('x', 'Chicken Roll'))).toEqual({ diet: 'non_veg', evidence: 'chicken' });
    expect(dietOf(d('x', 'Egg Bhurji Pav'))).toEqual({ diet: 'egg', evidence: 'egg' });
    expect(dietOf(d('x', 'Eggless Brownie'))).toEqual({ diet: 'not_mentioned', evidence: null });
    expect(dietOf(d('x', 'Special Thali', 'Mains', 'Rice, dal and butter chicken')).diet).toBe('non_veg');
    expect(dietOf(d('x', 'Veg Burger')).diet).toBe('not_mentioned');
  });

  it('never treats "non veg" as "veg"', () => {
    expect(dietRequest('i wnt some non veg')).toEqual({ want: 'non_veg', word: null });
    expect(dietRequest('NON-VEG please')).toEqual({ want: 'non_veg', word: null });
    expect(resolveMention('non veg', VEG_MENU).status).toBe('none');
    expect(dishesForDiet(VEG_MENU, { want: 'non_veg', word: null })).toEqual([]);
  });

  it('says honestly when a menu has no non-veg dishes, and offers the staff', () => {
    const a = browse('non veg', VEG_MENU);
    expect(a.cards).toEqual([]);
    expect(a.text).toMatch(/couldn’t find any non-veg dishes/);
    expect(a.staff).toBe('dietary');
  });

  it('lists only dishes whose own text proves them non-veg', () => {
    expect(browse('non veg', MIXED).cards.sort()).toEqual(['cr', 'eb', 'fc', 'st']);
    expect(browse('chicken', MIXED).cards.sort()).toEqual(['cr', 'st']);
    expect(browse('egg', MIXED).cards).toEqual(['eb']);
  });

  it('offers veg only as "no meat, fish or egg mentioned", with the caveat', () => {
    const a = browse('veg', MIXED);
    expect(a.cards.sort()).toEqual(['ct', 'ek', 'mp', 'vb', 'vcb']);
    expect(a.text).toMatch(/confirm with the staff/);
  });

  it('answers "is X veg?" only when the menu settles it, else hands to staff', () => {
    expect(dietary('is the chicken roll veg?', MIXED).text).toBe('Chicken Roll is not veg: the menu mentions chicken for it.');
    expect(dietary('is masala pav veg?', MIXED).staff).toBe('dietary');
    expect(dietary('is the paneer tikka spicy?', DEMO_MENU).staff).toBe('dietary');
  });

  it('routes diet wishes and timing questions in the rules, without a model', () => {
    expect(fastParse('avg time ...i wnt some non veg', VEG_MENU)).toMatchObject({ intent: 'browse', topic: 'non veg' });
    expect(fastParse('kuch chicken hai?', MIXED)).toMatchObject({ intent: 'browse', topic: 'chicken' });
    expect(fastParse('veg options', MIXED)).toMatchObject({ intent: 'browse', topic: 'veg' });
    expect(fastParse('2 veg burger', VEG_MENU)).toMatchObject({ intent: 'add' });
    expect(fastParse('how long will it take?', MIXED)).toMatchObject({ intent: 'ask', question: 'wait_time' });
    expect(fastParse('kitni der lagegi', MIXED)).toMatchObject({ intent: 'ask', question: 'wait_time' });
  });
});
