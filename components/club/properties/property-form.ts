import type { Photo } from '../PhotoUploader';

export const AMENITY_LABEL: Record<string, string> = {
  wifi: 'Wi-Fi', bonfire: 'Bonfire', big_screen: 'Big screen', pool: 'Pool', parking: 'Parking', kitchen: 'Kitchen', ac: 'AC', bar: 'Bar',
  live_music: 'Live music', garden: 'Garden', rooftop: 'Rooftop', pet_friendly: 'Pet friendly', workspace: 'Workspace', breakfast: 'Breakfast', shuttle: 'Shuttle',
};

export interface PropertyForm {
  name: string; categories: string[]; description: string; capacity: string; price_min: number; price_max: number; amenities: string[];
  address: string; city: string; state: string; country: string; lat: string; lng: string; house_rules: string; terms: string;
  business_id: string; photos: Photo[];
}

export const EMPTY_PROPERTY: PropertyForm = {
  name: '', categories: [], description: '', capacity: '20', price_min: 1000, price_max: 5000, amenities: [], address: '', city: '', state: '',
  country: 'India', lat: '', lng: '', house_rules: '', terms: '', business_id: '', photos: [],
};

export function toPropertyPayload(f: PropertyForm) {
  return {
    name: f.name, categories: f.categories, description: f.description, capacity: f.capacity, price_min: f.price_min, price_max: f.price_max,
    amenities: f.amenities, address: f.address, city: f.city, state: f.state, country: f.country, lat: f.lat || null, lng: f.lng || null,
    house_rules: f.house_rules, terms: f.terms, business_id: f.business_id || null, photo_paths: f.photos.map((p) => p.path),
  };
}

export function fromProperty(p: any): PropertyForm {
  return {
    name: p.name, categories: p.categories, description: p.description || '', capacity: String(p.capacity), price_min: p.price_min / 100,
    price_max: p.price_max / 100, amenities: p.amenities, address: p.address, city: p.city, state: p.state, country: p.country,
    lat: p.lat != null ? String(p.lat) : '', lng: p.lng != null ? String(p.lng) : '', house_rules: p.house_rules || '', terms: p.terms || '',
    business_id: p.business_id || '', photos: (p.photo_paths || []).map((path: string, i: number) => ({ path, url: p.photos?.[i] ?? null })),
  };
}
