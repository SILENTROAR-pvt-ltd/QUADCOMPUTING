import { describe, expect, it } from 'vitest';
import { dietChoices, dishDiet, matchesDiet } from './diet-filter';

const dal = { name: 'Dal Makhani', dietary: 'veg' };
const buddha = { name: 'Buddha Bowl', dietary: 'vegan' };
const omelette = { name: 'Masala Omelette', dietary: 'egg' };
const butterChicken = { name: 'Butter Chicken (Half)', dietary: 'non_veg' };
const unknown = { name: 'Chef Special Platter', dietary: 'jain-ish' };

describe('the menu diet filter', () => {
  it('reads each dish as veg, vegan, egg or non-veg', () => {
    expect([dal, buddha, omelette, butterChicken].map(dishDiet)).toEqual(['veg', 'vegan', 'egg', 'non_veg']);
  });

  it('shows vegan dishes under Veg too, and each other diet on its own', () => {
    const menu = [dal, buddha, omelette, butterChicken];
    expect(menu.filter((d) => matchesDiet(d, 'veg')).map((d) => d.name)).toEqual(['Dal Makhani', 'Buddha Bowl']);
    expect(menu.filter((d) => matchesDiet(d, 'vegan')).map((d) => d.name)).toEqual(['Buddha Bowl']);
    expect(menu.filter((d) => matchesDiet(d, 'egg')).map((d) => d.name)).toEqual(['Masala Omelette']);
    expect(menu.filter((d) => matchesDiet(d, 'non_veg')).map((d) => d.name)).toEqual(['Butter Chicken (Half)']);
    expect(menu.filter((d) => matchesDiet(d, 'all'))).toHaveLength(4);
  });

  it('keeps a dish whose diet is unknown out of every filter but All', () => {
    expect(matchesDiet(unknown, 'all')).toBe(true);
    expect((['veg', 'vegan', 'egg', 'non_veg'] as const).some((f) => matchesDiet(unknown, f))).toBe(false);
  });

  it('offers only the choices that narrow this menu', () => {
    expect(dietChoices([dal, omelette, butterChicken])).toEqual([
      { diet: 'veg', count: 1 }, { diet: 'egg', count: 1 }, { diet: 'non_veg', count: 1 },
    ]);
    // Pure veg: no Veg chip (it would show everything); a vegan dish still gets its chip.
    expect(dietChoices([dal, { ...dal, name: 'Paneer Tikka' }, buddha])).toEqual([{ diet: 'vegan', count: 1 }]);
    expect(dietChoices([dal, { ...dal, name: 'Paneer Tikka' }])).toEqual([]);
  });
});
