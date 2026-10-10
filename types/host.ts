export type Brand<T, B extends string> = T & { readonly __brand: B };
export type ISODateString = string;
export type OwnerCafeId = Brand<string, 'OwnerCafeId'>;
// Venue types (see lib/venue/venue-model.ts); 'dorm' and 'estate' are older names kept for stored rows.
export const CATEGORIES_HANDLED = [
  'cafe', 'restaurant', 'bar', 'bakery', 'cloud_kitchen', 'hotel', 'resort', 'homestay', 'hostel', 'villa', 'dorm', 'estate',
] as const;
export type CategoryHandled = (typeof CATEGORIES_HANDLED)[number];

export interface HostContact { email: string; phone: string | null; }

export interface HostProfile {
  readonly uniqueOwnerCafeId?: OwnerCafeId;
  displayName?: string;
  legalEntityName?: string;
  avatarUrl?: string | null;
  contact?: HostContact;
  ecosystemStatement?: string;
  categoriesHandled?: CategoryHandled[];
  readonly createdAt?: ISODateString;
  updatedAt?: ISODateString;
  hostId?: string;
  fullName: string;
  role: string;
  phone: string;
  email: string;
  gender: string;
  dob: string;
  bio: string;
  bannerUrl?: string;
  categories: string[];
  offersAccommodation?: boolean;
}

export interface BusinessLocation {
  locationId: string;
  businessName: string;
  gstNumber?: string;
  pincode: string;
  state: string;
  city: string;
  address: string;
  qrCodeHash: string;
}

export interface FoodMenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  imageUrl: string;
  addons: string;
}

export interface RoomTariffItem {
  id: string;
  title: string;
  category: string;
  tariffPerNight: number;
  maxGuests: number;
  imageUrl: string;
  addons: string;
}
