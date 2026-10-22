// Ready starts for the offers venues publish most. A template fills the kind, the tag and an example title and line,
// which the host edits; "Your own" starts empty. Nothing here is saved until the host publishes.
import type { OfferCategory } from '@/types/offers';

export interface OfferTemplate {
  id: string;
  label: string;
  emoji: string;
  category: OfferCategory;
  badge: string;
  title: string;
  description: string;
}

export const OFFER_TEMPLATES: OfferTemplate[] = [
  { id: 'buffet', label: 'Buffet', emoji: '🍛', category: 'food', badge: 'Buffet', title: 'Lunch Buffet', description: 'Unlimited starters, mains and desserts · 12 to 3 PM' },
  { id: 'happy-hour', label: 'Happy hour', emoji: '🍹', category: 'food', badge: 'Happy Hour', title: 'Happy Hour Drinks', description: 'Selected drinks at special prices · 5 to 8 PM daily' },
  { id: 'combo', label: 'Combo', emoji: '🍔', category: 'food', badge: 'Combo Deal', title: 'Meal Combo', description: 'Main, side and a drink together for one price' },
  { id: 'room', label: 'Room deal', emoji: '🛏️', category: 'room', badge: '20% OFF', title: 'Weekend Room Deal', description: 'Stay Friday to Sunday and save on every night' },
  { id: 'festive', label: 'Festive', emoji: '🎉', category: 'general', badge: 'Festive Special', title: 'Festive Special', description: 'A special menu and offers for the festival week' },
  { id: 'own', label: 'Your own', emoji: '✍️', category: 'food', badge: '', title: '', description: '' },
];

/** Tags a host can pick with one tap; any other tag can be typed. */
export const BADGE_PRESETS = [
  '20% OFF', '1+1 Free', 'Buffet', 'Happy Hour', 'Combo Deal', 'Free Breakfast',
  'Chef Special', 'Complimentary Drink', 'Kids Eat Free', 'Early Bird', 'Festive Special',
];
