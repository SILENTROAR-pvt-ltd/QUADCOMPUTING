import { describe, expect, it } from 'vitest';
import { dishMark } from './dish-mark';

describe('dishMark', () => {
  it('follows the diet the host chose', () => {
    expect(dishMark({ name: 'Paneer Tikka', dietary: 'veg' })).toBe('veg');
    expect(dishMark({ name: 'Buddha Bowl', dietary: 'vegan' })).toBe('veg');
    expect(dishMark({ name: 'Galouti Kebab', dietary: 'non_veg' })).toBe('non_veg');
    expect(dishMark({ name: 'Shakshuka', dietary: 'egg' })).toBe('egg');
  });

  it('marks a dish by its own words when the stored diet says veg', () => {
    expect(dishMark({ name: 'Butter Chicken', dietary: 'veg' })).toBe('non_veg');
    expect(dishMark({ name: 'Tikka Platter', category: 'Non-Veg Starters', dietary: 'veg' })).toBe('non_veg');
    expect(dishMark({ name: 'Masala Omelette', dietary: 'veg' })).toBe('egg');
    expect(dishMark({ name: 'Eggless Brownie', dietary: 'veg' })).toBe('veg');
  });

  it('keeps an egg dish as egg inside a non-veg section, but not one that names a meat', () => {
    expect(dishMark({ name: 'Egg Curry (Half)', category: 'Non Veg', dietary: 'egg' })).toBe('egg');
    expect(dishMark({ name: 'Egg Chicken Roll', category: 'Non Veg', dietary: 'egg' })).toBe('non_veg');
    expect(dishMark({ name: 'Plain Platter', category: 'Non Veg' })).toBe('non_veg');
  });

  it('follows the platform default (veg) for a dish added before diets were stored', () => {
    expect(dishMark({ name: 'Masala Chai' })).toBe('veg');
    expect(dishMark({ name: 'Pav Bhaji', category: 'Pav Bhaji' })).toBe('veg');
    expect(dishMark({ name: 'Chicken Roll' })).toBe('non_veg');
  });

  it('does not guess for a dish usually made with meat, unless a vegetable is named', () => {
    expect(dishMark({ name: 'Hyderabadi Biryani' })).toBeNull();
    expect(dishMark({ name: 'Steamed Momos' })).toBeNull();
    expect(dishMark({ name: 'Paneer Tikka' })).toBe('veg');
    expect(dishMark({ name: 'Veg Momos' })).toBe('veg');
    expect(dishMark({ name: 'Hyderabadi Biryani', dietary: 'veg' })).toBe('veg');
  });

  it('gives no mark to rooms, services, or a diet it does not know', () => {
    expect(dishMark({ name: 'Fish Pond Cabana', type: 'accommodation', dietary: 'veg' })).toBeNull();
    expect(dishMark({ name: 'Spa Ritual', type: 'service', dietary: 'veg' })).toBeNull();
    expect(dishMark({ name: 'Mystery Plate', dietary: 'jain-ish' })).toBeNull();
  });
});
