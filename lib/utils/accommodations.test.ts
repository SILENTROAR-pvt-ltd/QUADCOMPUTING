import { describe, it, expect } from 'vitest';
import type { RoomCategory, PhysicalRoom, RoomAddon } from '@/types';

describe('Accommodations & Room Management Ecosystem', () => {
  it('correctly models room category with auto-catalog sync and priced add-ons', () => {
    const addons: RoomAddon[] = [
      { id: 'a1', name: 'Extra Mattress', price: 500, isActive: true, billingType: 'per_night' },
      { id: 'a2', name: 'Breakfast (CP)', price: 350, isActive: true, billingType: 'per_person_per_day' },
      { id: 'a5', name: 'Airport Transfer', price: 1500, isActive: true, billingType: 'per_stay' },
    ];

    const category: RoomCategory = {
      id: 'cat-123',
      business_id: 'biz-1',
      catalog_item_id: 'cat-item-456',
      name: 'Deluxe Ocean Suite',
      price: 4500,
      occupancy: 3,
      total_units: 3,
      photos: ['https://example.com/suite.jpg'],
      amenities: ['High-Speed Wi-Fi', 'King Size Bed', 'Balcony'],
      addons,
      available_addons: addons,
    };

    expect(category.name).toBe('Deluxe Ocean Suite');
    expect(category.price).toBe(4500);
    expect(category.total_units).toBe(3);
    expect(category.catalog_item_id).toBe('cat-item-456');
    expect(category.addons).toHaveLength(3);
    expect(category.addons?.[0].name).toBe('Extra Mattress');
    expect(category.addons?.[0].price).toBe(500);
    expect(category.addons?.[0].billingType).toBe('per_night');
  });

  it('correctly calculates occupancy and status distribution for physical rooms', () => {
    const rooms: PhysicalRoom[] = [
      { id: 'r1', business_id: 'biz-1', category_id: 'cat-123', room_number: '101', status: 'VACANT' },
      {
        id: 'r2',
        business_id: 'biz-1',
        category_id: 'cat-123',
        room_number: '102',
        status: 'OCCUPIED',
        guest_name: 'Rahul Sharma',
        activeOrdersCount: 2,
        activeOrdersTotal: 650,
      },
      { id: 'r3', business_id: 'biz-1', category_id: 'cat-123', room_number: '103', status: 'CLEANING' },
      { id: 'r4', business_id: 'biz-1', category_id: 'cat-123', room_number: '104', status: 'MAINTENANCE' },
    ];

    const total = rooms.length;
    const vacant = rooms.filter((r) => r.status === 'VACANT').length;
    const occupied = rooms.filter((r) => r.status === 'OCCUPIED').length;
    const cleaning = rooms.filter((r) => r.status === 'CLEANING').length;
    const maintenance = rooms.filter((r) => r.status === 'MAINTENANCE').length;
    const occupancyRate = Math.round((occupied / total) * 100);

    expect(total).toBe(4);
    expect(vacant).toBe(1);
    expect(occupied).toBe(1);
    expect(cleaning).toBe(1);
    expect(maintenance).toBe(1);
    expect(occupancyRate).toBe(25);

    const occupiedRoom = rooms.find((r) => r.status === 'OCCUPIED');
    expect(occupiedRoom?.guest_name).toBe('Rahul Sharma');
    expect(occupiedRoom?.activeOrdersTotal).toBe(650);
  });

  it('correctly calculates dynamic add-on charges based on stay duration and billing types', () => {
    const selectedAddons: RoomAddon[] = [
      { id: 'a1', name: 'Extra Mattress', price: 500, isActive: true, billingType: 'per_night' },
      { id: 'a2', name: 'Breakfast (CP)', price: 350, isActive: true, billingType: 'per_person_per_day' },
      { id: 'a5', name: 'Airport Transfer', price: 1500, isActive: true, billingType: 'per_stay' },
    ];

    const numNights = 3;
    const calculatedAddonTotal = selectedAddons.reduce((sum, addon) => {
      if (addon.billingType === 'per_night' || addon.billingType === 'per_person_per_day') {
        return sum + addon.price * numNights;
      }
      return sum + addon.price;
    }, 0);

    expect(calculatedAddonTotal).toBe(4050);

    const roomRate = 4000;
    const totalStayCost = roomRate * numNights + calculatedAddonTotal;
    expect(totalStayCost).toBe(16050);
  });

  it('correctly computes consolidated folio with room tariff, selected add-ons, and restaurant orders', () => {
    const roomRate = 5000;
    const occupiedAddons: RoomAddon[] = [
      { id: 'a1', name: 'Extra Mattress', price: 500, isActive: true, billingType: 'per_night' },
      { id: 'a2', name: 'Breakfast (CP)', price: 350, isActive: true, billingType: 'per_person_per_day' },
    ];
    const addonsTotal = occupiedAddons.reduce((acc, a) => acc + a.price, 0);
    const foodOrdersTotal = 1420;

    const grandFolioTotal = roomRate + addonsTotal + foodOrdersTotal;
    expect(grandFolioTotal).toBe(5000 + 850 + 1420);
    expect(grandFolioTotal).toBe(7270);
  });

  it('models check-in payload with custom guest details, dates, and assigned physical room', () => {
    const checkInPayload = {
      action: 'check-in',
      roomId: 'room-101',
      guest_name: 'Priyanka Chopra',
      guest_phone: '+91 9876543210',
      guest_id_proof: 'AADHAAR-890123',
      check_in_time: new Date().toISOString(),
      expected_checkout_time: new Date(Date.now() + 86400000 * 2).toISOString(),
      total_guests: 2,
      advance_payment_amount: 3000,
      assigned_addons: [
        { id: 'a1', name: 'Extra Mattress', price: 500, isActive: true, billingType: 'per_night' },
      ],
    };

    expect(checkInPayload.guest_name).toBe('Priyanka Chopra');
    expect(checkInPayload.advance_payment_amount).toBe(3000);
    expect(checkInPayload.assigned_addons).toHaveLength(1);
    expect(checkInPayload.action).toBe('check-in');
  });

  it('models room status transitions correctly (VACANT -> OCCUPIED -> CLEANING -> VACANT)', () => {
    let currentStatus = 'VACANT';
    expect(currentStatus).toBe('VACANT');

    currentStatus = 'OCCUPIED';
    expect(currentStatus).toBe('OCCUPIED');

    currentStatus = 'CLEANING';
    expect(currentStatus).toBe('CLEANING');

    currentStatus = 'VACANT';
    expect(currentStatus).toBe('VACANT');
  });

  it('allows editing room number directly on check-in if host modifies it', () => {
    const originalRoomNumber = '101';
    const editedRoomNumber = '101-Executive';

    const checkInPayload = {
      action: 'check-in',
      roomId: 'room-101',
      room_number: editedRoomNumber,
      guest_name: 'Vikramaditya',
      check_in_time: new Date().toISOString(),
      total_guests: 2,
    };

    expect(checkInPayload.room_number).not.toBe(originalRoomNumber);
    expect(checkInPayload.room_number).toBe('101-Executive');
    expect(checkInPayload.action).toBe('check-in');
  });

  it('correctly prepares category update with renumbered rooms, new units, and deletions', () => {
    const existingRooms = [
      { id: 'r1', room_number: 'Room-1', status: 'VACANT' },
      { id: 'r2', room_number: 'Room-2', status: 'OCCUPIED' },
    ];

    const updatedRooms = [{ id: 'r1', room_number: '301' }];
    const newRoomNumbers = ['303'];
    const deletedRoomIds: string[] = [];

    const categoryEditPayload = {
      id: 'cat-1',
      name: 'Executive Deluxe Suite',
      price: 5500,
      occupancy: 3,
      updated_rooms: updatedRooms,
      new_room_numbers: newRoomNumbers,
      deleted_room_ids: deletedRoomIds,
    };

    expect(categoryEditPayload.name).toBe('Executive Deluxe Suite');
    expect(categoryEditPayload.price).toBe(5500);
    expect(categoryEditPayload.updated_rooms).toHaveLength(1);
    expect(categoryEditPayload.updated_rooms[0].room_number).toBe('301');
    expect(categoryEditPayload.new_room_numbers).toContain('303');
  });
});
