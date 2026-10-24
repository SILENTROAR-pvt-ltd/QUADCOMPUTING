import { BellRing, CalendarHeart, CalendarPlus, CheckCircle2, Handshake, Megaphone, QrCode, Smartphone, Sparkles, Ticket, Users, Wallet, type LucideIcon } from 'lucide-react';
import type { VideoId } from '@/lib/landing/videos';

export interface LeverStep { icon: LucideIcon; who: 'You' | 'Guest'; text: string }

export interface Lever {
  id: string;
  icon: LucideIcon;
  label: string;
  title: string;
  lead: string;
  /** The path from the venue's action to a guest through the door, four beats. */
  steps: LeverStep[];
  /** The portal recording (what the venue sees) and the phone recording (what the guest sees). */
  video: VideoId;
  phone: VideoId;
  url: string;
  ms: number;
  plans: string;
}

/** What a venue does in Quad Computing to bring more guests in and sell more to each one; both sides are real recordings. */
export const LEVERS: Lever[] = [
  {
    id: 'events', icon: CalendarHeart, label: 'Events', title: 'Turn a quiet night into a full one',
    lead: 'Publish an event in a minute. It appears on every table’s menu and in the lounge, and you see who is coming before the night.',
    steps: [
      { icon: CalendarPlus, who: 'You', text: 'Publish the event with seats, fee and perks' },
      { icon: Smartphone, who: 'Guest', text: 'Sees it on the menu and in the lounge' },
      { icon: Users, who: 'Guest', text: 'Taps “I’m Interested” for their party' },
      { icon: CheckCircle2, who: 'You', text: 'Confirm, message on WhatsApp, fill the night' },
    ],
    video: 'host-events', phone: 'guest-events', url: 'My guests · Live events', ms: 18000, plans: 'M²-Pro, Rhodium Pro or You earn, we earn',
  },
  {
    id: 'offers', icon: Ticket, label: 'Offers', title: 'Give guests a reason to come back',
    lead: 'Happy hours, brunch for two, a free night: offers sit above the menu at every table, and guests redeem them with a code at your counter.',
    steps: [
      { icon: Megaphone, who: 'You', text: 'Publish an offer from a template' },
      { icon: QrCode, who: 'Guest', text: 'Sees it above the menu at the table' },
      { icon: Ticket, who: 'Guest', text: 'Redeems it for a code' },
      { icon: Wallet, who: 'You', text: 'Settle the code at the till, on the bill' },
    ],
    video: 'host-offers', phone: 'guest-offers', url: 'Menu catalogue · Live offers', ms: 13000, plans: 'M²-Pro, Rhodium Pro or You earn, we earn',
  },
  {
    id: 'services', icon: Handshake, label: 'Services', title: 'Sell what is beyond the menu',
    lead: 'Bike rentals, bonfires, spa and tours: guests book them from the foot of the menu, your bell rings, and your partners deliver.',
    steps: [
      { icon: Sparkles, who: 'You', text: 'List the services you and your partners offer' },
      { icon: Smartphone, who: 'Guest', text: 'Books one from the menu in two taps' },
      { icon: BellRing, who: 'You', text: 'The bell rings until someone handles it' },
      { icon: Handshake, who: 'You', text: 'Share it to the partner, add it to the bill' },
    ],
    video: 'host-services', phone: 'guest-book-service', url: 'Reservations · Services & partners', ms: 10000, plans: 'every plan',
  },
];
