import { describe, it, expect } from 'vitest';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  type?: string;
  isAdHoc?: boolean;
  tax_rate?: number;
}

export function handleAddItemToCart(
  prev: CartItem[],
  item: { id: string; name: string; price: number; tax_rate?: number; category?: string }
): CartItem[] {
  const existingIndex = prev.findIndex(p => p.id === item.id);
  if (existingIndex >= 0) {
    return prev.map((p, idx) =>
      idx === existingIndex ? { ...p, qty: p.qty + 1 } : p
    );
  }
  return [
    ...prev,
    {
      id: item.id,
      name: item.name,
      price: Number(item.price) || 0,
      qty: 1,
      type: item.category || 'service',
      isAdHoc: false,
      tax_rate: item.tax_rate ?? 0.18,
    }
  ];
}

export function handleAddCustomItem(
  prev: CartItem[],
  name: string,
  price: number
): CartItem[] {
  if (!name.trim() || isNaN(price) || price <= 0) return prev;
  const customItem: CartItem = {
    id: 'custom_' + Date.now(),
    name: name.trim(),
    price: price,
    qty: 1,
    type: 'custom_service',
    isAdHoc: true,
    tax_rate: 0.18,
  };
  return [...prev, customItem];
}

export function calculateBillingTotals(
  items: CartItem[],
  customAmount: string = '',
  discountType: 'percentage' | 'flat' = 'percentage',
  discountInputValue: string = '',
  gstEnabled: boolean = true
) {
  const subtotal = items.reduce((acc, item) => acc + (item.price * item.qty), 0) + (Number(customAmount) || 0);
  const discountValue = Number(discountInputValue) || 0;

  const discountAmount = discountType === 'percentage'
    ? (subtotal * discountValue) / 100
    : Math.min(subtotal, discountValue);

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const gstAmount = gstEnabled ? taxableAmount * 0.18 : 0;
  const grandTotal = taxableAmount + gstAmount;

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    gstAmount,
    grandTotal
  };
}

export function filterCatalogItemIdsForRecipe(items: any[]): string[] {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return (items || [])
    .map((i: any) => i?.id)
    .filter((id: any) => typeof id === 'string' && uuidRegex.test(id) && !id.startsWith('custom'));
}

describe('Billing Workspace POS Catalog & Custom Entry Logic', () => {
  it('adds a new catalog item to an empty cart', () => {
    const initialCart: CartItem[] = [];
    const item = { id: 'item-101', name: 'Extra Mattress', price: 500, category: 'Room Add-ons' };
    const result = handleAddItemToCart(initialCart, item);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'item-101',
      name: 'Extra Mattress',
      price: 500,
      qty: 1,
      type: 'Room Add-ons',
      isAdHoc: false,
      tax_rate: 0.18,
    });
  });

  it('increments quantity and updates line-item when item already exists in cart', () => {
    const initialCart: CartItem[] = [
      { id: 'item-101', name: 'Extra Mattress', price: 500, qty: 1, type: 'Room Add-ons', isAdHoc: false }
    ];
    const item = { id: 'item-101', name: 'Extra Mattress', price: 500, category: 'Room Add-ons' };
    const result = handleAddItemToCart(initialCart, item);

    expect(result).toHaveLength(1);
    expect(result[0].qty).toBe(2);
  });

  it('generates unique ad-hoc custom line-item with isAdHoc: true and custom_ prefix', () => {
    const initialCart: CartItem[] = [
      { id: 'item-101', name: 'Extra Mattress', price: 500, qty: 1 }
    ];
    const result = handleAddCustomItem(initialCart, 'Rental Bike - 1 Day', 800);

    expect(result).toHaveLength(2);
    const customItem = result[1];
    expect(customItem.name).toBe('Rental Bike - 1 Day');
    expect(customItem.price).toBe(800);
    expect(customItem.qty).toBe(1);
    expect(customItem.isAdHoc).toBe(true);
    expect(customItem.type).toBe('custom_service');
    expect(customItem.id.startsWith('custom_')).toBe(true);
  });

  it('ignores invalid custom entries (empty name or non-positive price)', () => {
    const initialCart: CartItem[] = [];
    expect(handleAddCustomItem(initialCart, '', 500)).toHaveLength(0);
    expect(handleAddCustomItem(initialCart, '   ', 500)).toHaveLength(0);
    expect(handleAddCustomItem(initialCart, 'Valid Name', 0)).toHaveLength(0);
    expect(handleAddCustomItem(initialCart, 'Valid Name', -100)).toHaveLength(0);
  });

  it('reactively computes subtotal, GST (18%), and Grand Total when items are added', () => {
    // 2x Extra Mattress (₹500 each = 1000) + 1x Rental Bike (₹800) = ₹1800 subtotal
    const cart: CartItem[] = [
      { id: 'item-101', name: 'Extra Mattress', price: 500, qty: 2 },
      { id: 'custom_123', name: 'Rental Bike', price: 800, qty: 1, isAdHoc: true }
    ];

    const totals = calculateBillingTotals(cart, '', 'percentage', '', true);
    expect(totals.subtotal).toBe(1800);
    expect(totals.discountAmount).toBe(0);
    expect(totals.taxableAmount).toBe(1800);
    expect(totals.gstAmount).toBe(324); // 18% of 1800
    expect(totals.grandTotal).toBe(2124); // 1800 + 324
  });

  it('handles percentage and flat discounts correctly with GST', () => {
    const cart: CartItem[] = [
      { id: 'item-101', name: 'Service', price: 1000, qty: 1 }
    ];

    // 10% discount on 1000 = 100 discount, taxable 900, GST 18% of 900 = 162, grand total 1062
    const percentageResult = calculateBillingTotals(cart, '', 'percentage', '10', true);
    expect(percentageResult.subtotal).toBe(1000);
    expect(percentageResult.discountAmount).toBe(100);
    expect(percentageResult.taxableAmount).toBe(900);
    expect(percentageResult.gstAmount).toBe(162);
    expect(percentageResult.grandTotal).toBe(1062);

    // Flat ₹200 discount on 1000 = 200 discount, taxable 800, GST 18% of 800 = 144, grand total 944
    const flatResult = calculateBillingTotals(cart, '', 'flat', '200', true);
    expect(flatResult.subtotal).toBe(1000);
    expect(flatResult.discountAmount).toBe(200);
    expect(flatResult.taxableAmount).toBe(800);
    expect(flatResult.gstAmount).toBe(144);
    expect(flatResult.grandTotal).toBe(944);
  });

  it('disables GST tax calculation when gstEnabled is false', () => {
    const cart: CartItem[] = [
      { id: 'item-101', name: 'Room Service', price: 2000, qty: 1 }
    ];
    const totals = calculateBillingTotals(cart, '', 'percentage', '', false);
    expect(totals.subtotal).toBe(2000);
    expect(totals.gstAmount).toBe(0);
    expect(totals.grandTotal).toBe(2000);
  });

  it('recipe inventory deduction filters out ad-hoc custom items and only accepts valid UUIDs', () => {
    const mixedItems = [
      { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Fresh Burger', qty: 2 },
      { id: 'custom_1727045000000', name: 'Rental Bike', qty: 1, isAdHoc: true },
      { id: 'custom', name: 'Custom Entry', qty: 1 },
      { id: 'invalid-non-uuid-string', name: 'Bad ID', qty: 1 },
      { id: 'b1ffcd88-8b1a-4de7-aa5c-5aa8ac270b22', name: 'Cappuccino', qty: 1 }
    ];

    const validCatalogIds = filterCatalogItemIdsForRecipe(mixedItems);
    expect(validCatalogIds).toEqual([
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      'b1ffcd88-8b1a-4de7-aa5c-5aa8ac270b22'
    ]);
  });
});

describe('Production Hotel Service Suggestions & Templates', () => {
  it('validates production services contain major hotel offerings with proper rates and categories', async () => {
    const { DEFAULT_PRODUCTION_SERVICES, POPULAR_SERVICE_TEMPLATES } = await import(
      '../../components/host/workspaces/catalog/services/constants'
    );

    expect(DEFAULT_PRODUCTION_SERVICES.length).toBeGreaterThanOrEqual(12);

    const serviceNames = DEFAULT_PRODUCTION_SERVICES.map(s => s.name.toLowerCase());
    expect(serviceNames.some(n => n.includes('bike'))).toBe(true);
    expect(serviceNames.some(n => n.includes('candlelight'))).toBe(true);
    expect(serviceNames.some(n => n.includes('airport'))).toBe(true);
    expect(serviceNames.some(n => n.includes('bonfire'))).toBe(true);
    expect(serviceNames.some(n => n.includes('spa'))).toBe(true);

    DEFAULT_PRODUCTION_SERVICES.forEach(service => {
      expect(service.price).toBeGreaterThan(0);
      expect(service.duration).toBeTruthy();
      expect(service.category).toBeTruthy();
      expect(service.description).toBeTruthy();
    });

    expect(POPULAR_SERVICE_TEMPLATES.length).toBeGreaterThanOrEqual(6);
  });
});

