import { describe, it, expect } from 'vitest';
import { 
  CRITICAL_STOCK_TEMPLATES, 
  INVENTORY_CATEGORIES, 
  INVENTORY_UNITS,
  calculateBatchValuation,
  validateBatchItem,
  BatchIngestItem
} from '../../components/host/modals/NewRawStockModal';

describe('NewRawStockModal - Critical Items & Categorized Ingestion', () => {
  it('provides the comprehensive list of 15 high-value critical items', () => {
    expect(CRITICAL_STOCK_TEMPLATES).toHaveLength(15);
    const names = CRITICAL_STOCK_TEMPLATES.map(t => t.name);

    expect(names).toContain('Milk');
    expect(names).toContain('Eggs');
    expect(names).toContain('Chicken');
    expect(names).toContain('Mutton');
    expect(names).toContain('Rice');
    expect(names).toContain('Flour (Atta)');
    expect(names).toContain('Cooking Oil');
    expect(names).toContain('Cheese');
    expect(names).toContain('Butter');
    expect(names).toContain('Coffee Beans');
    expect(names).toContain('Tea Leaves');
    expect(names).toContain('Tomatoes');
    expect(names).toContain('Onions');
    expect(names).toContain('Cleaning Liquid');
    expect(names).toContain('Toilet Paper Rolls');
  });

  it('maps each critical stock template to an icon, logical category, and commercial unit', () => {
    const cheese = CRITICAL_STOCK_TEMPLATES.find(t => t.name === 'Cheese')!;
    expect(cheese.icon).toBe('🧀');
    expect(cheese.category).toBe('Dairy & Eggs');
    expect(cheese.unit).toBe('kg');
    expect(cheese.defaultCost).toBeGreaterThan(0);

    const chicken = CRITICAL_STOCK_TEMPLATES.find(t => t.name === 'Chicken')!;
    expect(chicken.icon).toBe('🍗');
    expect(chicken.category).toBe('Meat & Poultry');
    expect(chicken.unit).toBe('kg');

    const coffee = CRITICAL_STOCK_TEMPLATES.find(t => t.name === 'Coffee Beans')!;
    expect(coffee.icon).toBe('☕');
    expect(coffee.category).toBe('Beverages & Bar');
    expect(coffee.unit).toBe('kg');

    const milk = CRITICAL_STOCK_TEMPLATES.find(t => t.name === 'Milk')!;
    expect(milk.icon).toBe('🥛');
    expect(milk.unit).toBe('ltr');
  });

  it('provides an exhaustive list of standard commercial units and categories', () => {
    expect(INVENTORY_CATEGORIES).toContain('Dairy & Eggs');
    expect(INVENTORY_CATEGORIES).toContain('Meat & Poultry');
    expect(INVENTORY_CATEGORIES).toContain('Produce & Vegetables');
    expect(INVENTORY_CATEGORIES).toContain('Groceries & Spices');
    expect(INVENTORY_CATEGORIES).toContain('Cleaning Supplies');
    expect(INVENTORY_CATEGORIES).toContain('Toiletries & Guest Amenities');

    const unitValues = INVENTORY_UNITS.map(u => u.value);
    expect(unitValues).toContain('kg');
    expect(unitValues).toContain('ltr');
    expect(unitValues).toContain('grams');
    expect(unitValues).toContain('pcs');
    expect(unitValues).toContain('packets');
    expect(unitValues).toContain('crates');
    expect(unitValues).toContain('boxes');
    expect(unitValues).toContain('bottles');
    expect(unitValues).toContain('tins');
  });

  it('calculates total batch valuation accurately across multiple selected items with edited price and qty', () => {
    const batch: BatchIngestItem[] = [
      {
        id: 'milk',
        name: 'Milk',
        category: 'Dairy & Eggs',
        unit: 'ltr',
        icon: '🥛',
        quantity: '25', // edited from 20 to 25
        costPerUnit: '68', // edited from 65 to 68
        threshold: '10',
        isCritical: true,
      },
      {
        id: 'cheese',
        name: 'Cheese',
        category: 'Dairy & Eggs',
        unit: 'kg',
        icon: '🧀',
        quantity: '4',
        costPerUnit: '460', // edited from 450 to 460
        threshold: '4',
        isCritical: true,
      },
      {
        id: 'eggs',
        name: 'Eggs',
        category: 'Dairy & Eggs',
        unit: 'pcs',
        icon: '🥚',
        quantity: '120',
        costPerUnit: '7.5',
        threshold: '60',
        isCritical: true,
      }
    ];

    // (25 * 68) + (4 * 460) + (120 * 7.5) = 1700 + 1840 + 900 = 4440
    const valuation = calculateBatchValuation(batch);
    expect(valuation).toBe(4440);
  });

  it('validates batch items for non-negative quantities and unit costs', () => {
    const validItem: BatchIngestItem = {
      id: 'rice',
      name: 'Rice',
      category: 'Groceries & Spices',
      unit: 'kg',
      icon: '🍚',
      quantity: '50',
      costPerUnit: '60',
      threshold: '25',
      isCritical: true,
    };
    expect(validateBatchItem(validItem)).toBeNull();

    const invalidQtyItem: BatchIngestItem = {
      ...validItem,
      quantity: '-5',
    };
    expect(validateBatchItem(invalidQtyItem)).toContain('invalid quantity');

    const invalidCostItem: BatchIngestItem = {
      ...validItem,
      costPerUnit: '-10',
    };
    expect(validateBatchItem(invalidCostItem)).toContain('invalid unit cost');

    const invalidThresholdItem: BatchIngestItem = {
      ...validItem,
      threshold: 'abc',
    };
    expect(validateBatchItem(invalidThresholdItem)).toContain('invalid low-stock threshold');
  });
});
