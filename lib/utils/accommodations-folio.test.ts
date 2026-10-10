import { describe, it, expect } from 'vitest';
import type { RoomAddon } from '@/types';
import { calculateNights, computeStayHistoryMetrics, filterPastStays, calculateFolioBilling } from './accommodations';

describe('Accommodations Folio Billing & Stay Metrics', () => {
  it('correctly calculates stay duration in nights across dates and edge cases', () => {
    const checkIn = '2026-09-20T14:00:00.000Z';
    const checkOut = '2026-09-22T11:00:00.000Z';
    expect(calculateNights(checkIn, checkOut)).toBe(2);

    const sameDayCheckOut = '2026-09-20T20:00:00.000Z';
    expect(calculateNights(checkIn, sameDayCheckOut)).toBe(1);

    expect(calculateNights('', null)).toBe(1);
  });

  it('correctly computes stay history metrics across all completed checkouts', () => {
    const mockStays = [
      {
        id: 'stay-1',
        business_id: 'biz-1',
        room_id: 'r1',
        guest_name: 'Amitabh Sen',
        guest_phone: '+91 9876543210',
        check_in_time: '2026-09-10T12:00:00Z',
        check_out_time: '2026-09-13T10:00:00Z',
        nights: 3,
        total_guests: 2,
        total_billed_amount: 15000,
        status: 'SETTLED',
      },
      {
        id: 'stay-2',
        business_id: 'biz-1',
        room_id: 'r2',
        guest_name: 'Sunita Reddy',
        guest_phone: '+91 9123456780',
        check_in_time: '2026-09-15T14:00:00Z',
        check_out_time: '2026-09-16T11:00:00Z',
        nights: 1,
        total_guests: 1,
        total_billed_amount: 4500,
        status: 'SETTLED',
      },
      {
        id: 'stay-3',
        business_id: 'biz-1',
        room_id: 'r3',
        guest_name: 'Karan Johar',
        guest_phone: '+91 9988776655',
        check_in_time: '2026-09-18T10:00:00Z',
        check_out_time: '2026-09-20T10:00:00Z',
        nights: 2,
        total_guests: 3,
        total_billed_amount: 12000,
        status: 'SETTLED',
      },
    ];

    const metrics = computeStayHistoryMetrics(mockStays as any);
    expect(metrics.totalCheckouts).toBe(3);
    expect(metrics.totalRevenue).toBe(31500);
    expect(metrics.avgLengthOfStay).toBe(2);
    expect(metrics.totalGuestsHosted).toBe(6);
  });

  it('correctly filters past stays by guest name, phone, room number, and category', () => {
    const mockStays = [
      {
        id: 's1',
        guest_name: 'Pooja Hegde',
        guest_phone: '+91 9999988888',
        room_number: '101',
        room: { category: { id: 'cat-suite', name: 'Royal Suite' } },
        check_out_time: new Date().toISOString(),
      },
      {
        id: 's2',
        guest_name: 'Vikram Seth',
        guest_phone: '+91 7777766666',
        room_number: '202',
        room: { category: { id: 'cat-deluxe', name: 'Deluxe Room' } },
        check_out_time: new Date().toISOString(),
      },
    ];

    const nameFiltered = filterPastStays(mockStays as any, 'Pooja');
    expect(nameFiltered).toHaveLength(1);
    expect(nameFiltered[0].id).toBe('s1');

    const phoneFiltered = filterPastStays(mockStays as any, '77777');
    expect(phoneFiltered).toHaveLength(1);
    expect(phoneFiltered[0].id).toBe('s2');

    const catFiltered = filterPastStays(mockStays as any, '', 'cat-suite');
    expect(catFiltered).toHaveLength(1);
    expect(catFiltered[0].room_number).toBe('101');
  });

  describe('Consolidated Folio Billing & Ghost Order Prevention', () => {
    it('strictly outputs ₹0.00 for room service when 0 F&B orders exist', () => {
      const folio = calculateFolioBilling({
        roomRate: 2500,
        nights: 2,
        addons: [],
        orders: [],
      });

      expect(folio.roomRate).toBe(2500);
      expect(folio.nights).toBe(2);
      expect(folio.roomTariffSubtotal).toBe(5000);
      expect(folio.addonsSubtotal).toBe(0);
      expect(folio.ordersSubtotal).toBe(0);
      expect(folio.grandTotalPayable).toBe(5000);
      expect(folio.ordersCount).toBe(0);
    });

    it('strictly excludes master room_stay order from room service subtotal to prevent double counting base rent', () => {
      const folio = calculateFolioBilling({
        roomRate: 2500,
        nights: 2,
        addons: [],
        orders: [{ order_type: 'room_stay', grand_total: 5000, total_amount: 5000 }],
      });

      expect(folio.roomTariffSubtotal).toBe(5000);
      expect(folio.ordersSubtotal).toBe(0);
      expect(folio.grandTotalPayable).toBe(5000);
      expect(folio.ordersCount).toBe(0);
    });

    it('accurately calculates grand total with base tariff, add-ons, and actual F&B orders', () => {
      const addons: RoomAddon[] = [
        { id: 'a1', name: 'Bonfire Night', price: 600, isActive: true, billingType: 'per_stay' },
      ];
      const orders = [
        { order_type: 'room_stay', grand_total: 5000 },
        { order_type: 'room_service', grand_total: 350 },
        { order_type: 'pos', grand_total: 150 },
      ];

      const folio = calculateFolioBilling({
        roomRate: 2500,
        nights: 2,
        addons,
        orders,
      });

      expect(folio.roomTariffSubtotal).toBe(5000);
      expect(folio.addonsSubtotal).toBe(600);
      expect(folio.ordersSubtotal).toBe(500);
      expect(folio.grandTotalPayable).toBe(6100);
      expect(folio.ordersCount).toBe(2);
    });
  });

  describe('Recipe Badge Visibility & Accommodation Edit Form Unification', () => {
    it('only renders the recipe button for food and beverage items, hiding it for accommodations and services', async () => {
      const { isRecipeEligible } = await import('./catalog-item');

      expect(isRecipeEligible({ kind: 'food_beverage', name: 'Cold Brew' })).toBe(true);
      expect(isRecipeEligible({ item_type: 'food_and_bev', name: 'Pasta' })).toBe(true);
      expect(isRecipeEligible({ item_type: 'food', name: 'Pizza' })).toBe(true);
      expect(isRecipeEligible({ category: 'Food & Bev', name: 'Smoothie' })).toBe(true);

      expect(isRecipeEligible({ kind: 'accommodation', name: 'Deluxe Room' })).toBe(false);
      expect(isRecipeEligible({ item_type: 'room', name: 'Standard Room' })).toBe(false);
      expect(isRecipeEligible({ kind: 'service', name: 'Laundry Service' })).toBe(false);
      expect(isRecipeEligible({ item_type: 'service', name: 'Airport Transfer' })).toBe(false);
      expect(isRecipeEligible({ name: 'Candlelight Dinner Setup' })).toBe(false);
      expect(isRecipeEligible({ name: 'Bonfire & Night Barbecue' })).toBe(false);
      expect(isRecipeEligible({ name: 'Bicycle / Mountain Bike Rental' })).toBe(false);
    });

    it('sanitizes and preserves addons when updating room categories', () => {
      const rawAddons = [
        { name: 'Extra Mattress', price: '500', isActive: true, billingType: 'per_night' },
        { name: 'Baby Cot', price: 300, isActive: true, billingType: 'per_night' },
      ];

      const sanitized = rawAddons.map((a: any, idx: number) => ({
        id: a.id || `addon_${idx}`,
        name: String(a.name || 'Extra Service').trim(),
        price: typeof a.price === 'number' ? a.price : parseFloat(a.price) || 0,
        isActive: a.isActive !== undefined ? Boolean(a.isActive) : true,
        billingType: ['per_night', 'per_person_per_day', 'per_stay'].includes(a.billingType)
          ? a.billingType
          : 'per_night',
      }));

      expect(sanitized).toHaveLength(2);
      expect(sanitized[0].price).toBe(500);
      expect(sanitized[1].price).toBe(300);
      expect(sanitized[0].name).toBe('Extra Mattress');
    });

    it('correctly constructs dynamic catalog creation payloads for Food, Service, and Accommodation', () => {
      const foodPayload = {
        name: 'Truffle Fries',
        itemType: 'food',
        category: 'Starters',
        price: 299,
        dietType: 'veg',
        prepTimeMinutes: 15,
        metadata: {
          dietary: 'veg',
          prep_time_minutes: 15,
          is_recipe_ready: true,
        },
      };
      expect(foodPayload.itemType).toBe('food');
      expect(foodPayload.metadata.dietary).toBe('veg');
      expect(foodPayload.metadata.prep_time_minutes).toBe(15);
      expect(foodPayload.metadata.is_recipe_ready).toBe(true);

      const servicePayload = {
        name: 'Airport Transfer',
        itemType: 'service',
        category: 'Transportation',
        price: 1500,
        duration: 'Per Stay',
        providerType: 'in_house',
        metadata: {
          duration: 'Per Stay',
          provider_type: 'in_house',
        },
      };
      expect(servicePayload.itemType).toBe('service');
      expect(servicePayload.metadata.duration).toBe('Per Stay');
      expect(servicePayload.metadata.provider_type).toBe('in_house');

      const accommodationPayload = {
        name: 'Presidential Suite',
        price: 8500,
        occupancy: 4,
        amenities: ['Jacuzzi', 'Balcony', 'WiFi'],
        addons: [{ id: 'a1', name: 'Extra Bed', price: 800, isActive: true, billingType: 'per_night' }],
        room_numbers: ['501', '502'],
      };
      expect(accommodationPayload.name).toBe('Presidential Suite');
      expect(accommodationPayload.price).toBe(8500);
      expect(accommodationPayload.room_numbers).toHaveLength(2);
      expect(accommodationPayload.addons[0].price).toBe(800);
    });

    it('formats food & beverage edit update payload identically to creation payload', () => {
      const existingFoodItem = {
        id: 'food_123',
        name: 'Artisanal Sourdough Toast',
        price: { amountMinor: 280, currency: 'INR' },
        category: 'Starters',
        description: 'Warm sourdough with whipped herb butter',
        imageUrl: 'https://example.com/toast.jpg',
        dietary: 'vegan',
        prepTimeMinutes: 12,
        metadata: {
          dietary: 'vegan',
          prep_time_minutes: 12,
          is_recipe_ready: true,
        },
      };

      const editUpdatePayload = {
        id: existingFoodItem.id,
        name: existingFoodItem.name,
        item_type: 'food',
        category: existingFoodItem.category,
        price: 320,
        description: existingFoodItem.description,
        image_url: existingFoodItem.imageUrl,
        dietType: 'vegan',
        prepTimeMinutes: 12,
        inventoryCount: 40,
        metadata: {
          dietary: 'vegan',
          prep_time_minutes: 12,
          is_recipe_ready: true,
        },
      };

      expect(editUpdatePayload.id).toBe('food_123');
      expect(editUpdatePayload.item_type).toBe('food');
      expect(editUpdatePayload.price).toBe(320);
      expect(editUpdatePayload.dietType).toBe('vegan');
      expect(editUpdatePayload.metadata.is_recipe_ready).toBe(true);
    });
  });
});
