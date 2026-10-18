// A made-up café menu for Vibey's tests and golden set. No real venue or guest data. It is built to be hard: several
// coffees and teas, a dish with "and" in its name, a dish whose name starts with a note word, two club sandwiches.
import type { MenuDish } from '@/lib/vibey/guest/retrieve';

const d = (id: string, name: string, price: number, category: string, description = ''): MenuDish => ({ id, name, price, category, description });

export const DEMO_MENU: MenuDish[] = [
  d('d-cold-coffee', 'Cold Coffee', 220, 'Coffee', 'Chilled coffee blended with milk and ice cream.'),
  d('d-iced-americano', 'Iced Americano', 190, 'Coffee'),
  d('d-cappuccino', 'Cappuccino', 180, 'Coffee', 'Espresso with steamed milk foam.'),
  d('d-filter-coffee', 'Filter Coffee', 120, 'Coffee'),
  d('d-masala-chai', 'Masala Chai', 80, 'Tea', 'Spiced milk tea.'),
  d('d-ginger-tea', 'Ginger Tea', 90, 'Tea'),
  d('d-green-tea', 'Green Tea', 110, 'Tea'),
  d('d-lime-soda', 'Fresh Lime Soda', 120, 'Beverages'),
  d('d-mango-lassi', 'Mango Lassi', 150, 'Beverages'),
  d('d-choc-shake', 'Chocolate Shake', 210, 'Beverages'),
  d('d-penne', 'Penne Arrabbiata Pasta', 340, 'Pasta'),
  d('d-mac', 'Mac and Cheese', 320, 'Pasta'),
  d('d-paneer-tikka', 'Paneer Tikka', 290, 'Starters', 'Chargrilled cottage cheese with peppers.'),
  d('d-fries', 'Peri Peri Fries', 160, 'Starters'),
  d('d-veg-club', 'Veg Club Sandwich', 230, 'Sandwiches'),
  d('d-chicken-club', 'Chicken Club Sandwich', 280, 'Sandwiches'),
  d('d-margherita', 'Margherita Pizza', 350, 'Pizza'),
  d('d-extra-cheese', 'Extra Cheese Pizza', 420, 'Pizza'),
  d('d-aloo-paratha', 'Aloo Paratha', 140, 'Mains', 'Potato-stuffed flatbread with curd.'),
  d('d-gulab-jamun', 'Gulab Jamun', 110, 'Desserts'),
  d('d-brownie', 'Chocolate Brownie', 170, 'Desserts'),
  d('d-cheesecake', 'Blueberry Cheesecake', 260, 'Desserts'),
  d('d-caesar', 'Caesar Salad', 270, 'Salads'),
  d('d-tomato-soup', 'Tomato Soup', 150, 'Soups'),
];

export const DEMO_FEATURED = ['d-cold-coffee', 'd-paneer-tikka', 'd-brownie'];

export const DEMO_IDS = new Set(DEMO_MENU.map((x) => x.id));
export const byName = (name: string) => {
  const dish = DEMO_MENU.find((x) => x.name === name);
  if (!dish) throw new Error(`No demo dish called ${name}`);
  return dish;
};
