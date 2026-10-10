export type OfferCategory = 'room' | 'food' | 'general';

export interface VenueLiveOffer {
  id: string;
  venue_id: string;
  title: string;
  description?: string | null;
  category: OfferCategory;
  discount_badge: string;
  valid_until?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}
