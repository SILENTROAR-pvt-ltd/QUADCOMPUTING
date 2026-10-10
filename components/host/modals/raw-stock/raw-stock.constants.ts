import { CriticalStockTemplate } from './raw-stock.types';

export const CRITICAL_STOCK_TEMPLATES: CriticalStockTemplate[] = [
  { id: 'milk', name: 'Milk', category: 'Dairy & Eggs', unit: 'ltr', icon: '🥛', defaultCost: 65, defaultThreshold: 10, defaultQty: 20 },
  { id: 'eggs', name: 'Eggs', category: 'Dairy & Eggs', unit: 'pcs', icon: '🥚', defaultCost: 7, defaultThreshold: 60, defaultQty: 100 },
  { id: 'chicken', name: 'Chicken', category: 'Meat & Poultry', unit: 'kg', icon: '🍗', defaultCost: 240, defaultThreshold: 10, defaultQty: 15 },
  { id: 'mutton', name: 'Mutton', category: 'Meat & Poultry', unit: 'kg', icon: '🥩', defaultCost: 750, defaultThreshold: 5, defaultQty: 8 },
  { id: 'rice', name: 'Rice', category: 'Groceries & Spices', unit: 'kg', icon: '🍚', defaultCost: 60, defaultThreshold: 25, defaultQty: 50 },
  { id: 'atta', name: 'Flour (Atta)', category: 'Groceries & Spices', unit: 'kg', icon: '🌾', defaultCost: 45, defaultThreshold: 20, defaultQty: 40 },
  { id: 'oil', name: 'Cooking Oil', category: 'Groceries & Spices', unit: 'ltr', icon: '🛢️', defaultCost: 150, defaultThreshold: 15, defaultQty: 30 },
  { id: 'cheese', name: 'Cheese', category: 'Dairy & Eggs', unit: 'kg', icon: '🧀', defaultCost: 450, defaultThreshold: 4, defaultQty: 5 },
  { id: 'butter', name: 'Butter', category: 'Dairy & Eggs', unit: 'kg', icon: '🧈', defaultCost: 520, defaultThreshold: 5, defaultQty: 8 },
  { id: 'coffee', name: 'Coffee Beans', category: 'Beverages & Bar', unit: 'kg', icon: '☕', defaultCost: 850, defaultThreshold: 3, defaultQty: 5 },
  { id: 'tea', name: 'Tea Leaves', category: 'Beverages & Bar', unit: 'kg', icon: '🍵', defaultCost: 380, defaultThreshold: 5, defaultQty: 10 },
  { id: 'tomatoes', name: 'Tomatoes', category: 'Produce & Vegetables', unit: 'kg', icon: '🍅', defaultCost: 40, defaultThreshold: 15, defaultQty: 25 },
  { id: 'onions', name: 'Onions', category: 'Produce & Vegetables', unit: 'kg', icon: '🧅', defaultCost: 35, defaultThreshold: 20, defaultQty: 30 },
  { id: 'cleaning', name: 'Cleaning Liquid', category: 'Cleaning Supplies', unit: 'ltr', icon: '🧴', defaultCost: 120, defaultThreshold: 10, defaultQty: 15 },
  { id: 'toilet_paper', name: 'Toilet Paper Rolls', category: 'Toiletries & Guest Amenities', unit: 'pcs', icon: '🧻', defaultCost: 35, defaultThreshold: 30, defaultQty: 48 },
];

export const INVENTORY_CATEGORIES = [
  'Dairy & Eggs',
  'Meat & Poultry',
  'Produce & Vegetables',
  'Groceries & Spices',
  'Beverages & Bar',
  'Bakery & Breads',
  'Cleaning Supplies',
  'Toiletries & Guest Amenities',
  'Packaging & Disposables',
  'Maintenance & Hardware',
  'General Raw Stock',
];

export const INVENTORY_UNITS = [
  { value: 'kg', label: 'kg (Kilograms)' },
  { value: 'ltr', label: 'ltr (Liters)' },
  { value: 'grams', label: 'grams (Grams)' },
  { value: 'pcs', label: 'pcs (Pieces)' },
  { value: 'packets', label: 'packets (Packets)' },
  { value: 'crates', label: 'crates (Crates)' },
  { value: 'boxes', label: 'boxes (Boxes)' },
  { value: 'bottles', label: 'bottles (Bottles)' },
  { value: 'tins', label: 'tins (Tins / Cans)' },
];
