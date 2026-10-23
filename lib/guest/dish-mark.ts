// The veg / non-veg mark on a dish. The host chooses the diet when they add a dish, and the platform's default is veg:
// the create route stores "veg" when none is picked, and the dish editor shows an unset dish as veg. Dishes added before
// diets were stored have none, so they follow that same default. Two guards come before it:
//  - a dish whose own name, category or description names a meat, fish or egg is marked by those words, whatever was
//    stored: showing a chicken dish as veg is a broken promise, marking a veg dish red is only a missed order;
//  - a dish usually made with meat (biryani, kebab, momos…) with no diet chosen and no vegetable named gets no mark
//    rather than a guess.
// Rooms and services never get a mark.
import { dietOf } from '@/lib/vibey/guest/diet';

export type DishMark = 'veg' | 'non_veg' | 'egg';

interface Dish { name: string; description?: string | null; category?: string | null; type?: string | null; dietary?: string | null }

const NOT_FOOD = new Set(['service', 'accommodation', 'room']);
const OFTEN_MEAT = /\b(biryani|kebabs?|kababs?|seekh|shawarma|wings|momos?|haleem|nihari|rogan|galouti|tangdi|lollipop|tandoori|tikka|korma)\b/i;
const VEG_WORD = /\b(paneer|veg|vegetable|veggie|soya|soy|mushroom|aloo|gobi|tofu|corn|chana|dal|jackfruit|kathal|cheese)\b/i;

export function dishMark(d: Dish): DishMark | null {
  if (d.type && NOT_FOOD.has(d.type)) return null;
  const said = dietOf({ name: d.name, category: d.category ?? '', description: d.description ?? '' }).diet;
  if (said === 'non_veg' || d.dietary === 'non_veg') return 'non_veg';
  if (said === 'egg' || d.dietary === 'egg') return 'egg';
  if (d.dietary === 'veg' || d.dietary === 'vegan') return 'veg';
  if (d.dietary) return null;
  const text = `${d.name} ${d.description ?? ''}`;
  return OFTEN_MEAT.test(text) && !VEG_WORD.test(text) ? null : 'veg';
}
