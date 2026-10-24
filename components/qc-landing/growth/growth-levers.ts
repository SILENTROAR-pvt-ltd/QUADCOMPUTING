import { CalendarHeart, Handshake, Ticket, type LucideIcon } from 'lucide-react';
import type { VideoId } from '@/lib/landing/videos';

export interface Lever {
  id: string;
  icon: LucideIcon;
  label: string;
  title: string;
  lead: string;
  points: string[];
  video: VideoId;
  url: string;
  ms: number;
  plans: string;
}

/** What a venue does in Quad Computing to bring more guests in and sell more to each one; each is a real portal recording. */
export const LEVERS: Lever[] = [
  {
    id: 'events', icon: CalendarHeart, label: 'Events', title: 'Turn a quiet night into a full one',
    lead: 'Publish a live event in a minute. Guests tap “I’m interested” from the lounge and the menu, and you see every party before the night.',
    points: ['Interested list with party sizes, men and women, and the time they joined', 'Confirm or decline, and send an alert or a discount on WhatsApp in one tap', 'Seat limits, entry fees and perks; export the list as CSV'],
    video: 'host-events', url: 'My guests · Live events', ms: 18000, plans: 'M²-Pro, Rhodium Pro or You earn, we earn',
  },
  {
    id: 'offers', icon: Ticket, label: 'Offers', title: 'Give guests a reason to come back',
    lead: 'Happy hours, brunch for two, a free night: offers sit on the menu and in the lounge, and guests redeem them with a code at your counter.',
    points: ['Start from a template: buffet, happy hour, combo, room deal, festive', 'Food, rooms or anything you sell, with a photo and an end date', 'Redemption codes and questions arrive live; settle them at the till'],
    video: 'host-offers', url: 'Menu catalogue · Live offers', ms: 13000, plans: 'M²-Pro, Rhodium Pro or You earn, we earn',
  },
  {
    id: 'services', icon: Handshake, label: 'Services', title: 'Sell what is beyond the menu',
    lead: 'Bike rentals, cabs, spa, bonfires and tours: guests book them from the menu, the bell rings, and your partners deliver.',
    points: ['Every request rings until someone marks it done', 'Share the guest’s order to a partner on WhatsApp in one tap', 'Add what the partner charged straight to the guest’s bill'],
    video: 'host-services', url: 'Reservations · Services & partners', ms: 10000, plans: 'every plan',
  },
];
