import type { RoomAddon } from '@/types';

export interface RoomCategoryFormData {
  id?: string;
  name: string;
  price: number;
  occupancy: number;
  photos: string[];
  amenities: string[];
  addons: RoomAddon[];
  room_numbers?: string[];
}

export const DEFAULT_COMMON_AMENITIES = [
  'High-Speed Wi-Fi',
  'Air Conditioning',
  'King Size Bed',
  'Ensuite Bathroom',
  'Smart 4K TV',
  'Complimentary Breakfast',
  'Private Balcony',
  'Work Desk & Chair',
  'Mini Bar & Fridge',
  '24/7 Room Service',
  'Pool Access',
  'Mountain View',
  'Geyser / Hot Water',
  'Electric Kettle & Tea/Coffee',
  'Bathtub / Jacuzzi',
  'Room Heater',
  'Electronic Safe Locker',
  'Wardrobe & Hangers',
  'Soundproofing',
  'Daily Housekeeping',
  'Garden / River View',
  'Blackout Curtains',
  'Pet Friendly',
  'Keycard Digital Access'
];
