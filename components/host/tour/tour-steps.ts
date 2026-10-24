import type { LucideIcon } from 'lucide-react';
import { BedDouble, BookOpen, CalendarDays, ChefHat, CreditCard, PartyPopper, ReceiptText, Sparkles, UserRound, Wallet } from 'lucide-react';
import type { BusinessModel } from '@/lib/venue/venue-model';
import type { ControlCenterTab } from '../ControlCenterHeader';

export interface TourStep {
  id: string;
  /** The workspace shown behind the tile while this step is open. */
  tab?: ControlCenterTab;
  icon: LucideIcon;
  kicker: string;
  title: string;
  text: string;
  todo: string[];
}

type Draft = Omit<TourStep, 'kicker'> & { kicker?: string; stay?: Partial<Pick<TourStep, 'title' | 'text' | 'todo'>> };

// The tour walks the sections a new venue sets up first, in the order that gets it serving soonest. A step whose
// section is not in this venue's sidebar (a café has no Accommodations) is left out.
const STEPS: Draft[] = [
  { id: 'profile', tab: 'profile', icon: UserRound, title: 'Your venue, set up properly',
    text: 'Everything guests and the tax office see about you, and the PIN that keeps the till safe.',
    todo: ['Add GST, FSSAI, address and phone numbers', 'Add bank and UPI details for payments', 'Set a master PIN, and give each staff member their own PIN'] },
  { id: 'catalog', tab: 'catalog', icon: BookOpen, title: 'Build your menu',
    text: 'What guests can order from their table: dishes, prices, photos, and what makes your place feel like yours.',
    todo: ['Add dishes with a photo, a price and veg or non-veg', 'Pick your top picks and add photos to the memory vault', 'Publish live events and offers'],
    stay: { title: 'Services and add-ons', text: 'What guests can add to a stay: breakfast, transfers, activities and more.', todo: ['Add each service with a photo and price', 'Publish live offers for your guests'] } },
  { id: 'billing', tab: 'billing', icon: CreditCard, title: 'Tables, QR codes and the till',
    text: 'Guests scan the QR code on their table, order and ask for the bill. You settle it here, or take orders yourself.',
    todo: ['Create your tables and print each table’s QR code', 'Take walk-in orders from the counter', 'Settle bills by cash, UPI or card'],
    stay: { title: 'Billing at the desk', text: 'Every bill in one place: rooms, food sent to rooms and services.', todo: ['Settle a room’s bill at check-out', 'Take a payment at the desk'] } },
  { id: 'kitchen', tab: 'kitchen', icon: ChefHat, title: 'Orders reach the kitchen',
    text: 'Each order arrives as a ticket the moment a guest sends it, and the bell rings on every screen.',
    todo: ['Turn on order alerts on the kitchen’s phone or tablet', 'Move each ticket to cooking, then ready'] },
  { id: 'accommodations', tab: 'accommodations', icon: BedDouble, title: 'Rooms and the front desk',
    text: 'Your rooms, today’s arrivals and who is staying. Guests reserve for free on your stay page and pay at the desk.',
    todo: ['Add room types with photos, rates and rooms', 'Share your stay page link with guests', 'Check guests in and out'] },
  { id: 'reservations', tab: 'reservations', icon: CalendarDays, title: 'Every request in one place',
    text: 'Table bookings, room reservations, event guest lists, offer and service requests, as guests make them.',
    todo: ['Confirm or decline each request', 'The sidebar lights up when something new arrives'] },
  { id: 'wallet', tab: 'wallet', icon: Wallet, title: 'Your plan and credit',
    text: 'Your plan: a yearly plan with no bill fee, or You earn, we earn at ₹3 a settled bill from credit you top up.',
    todo: ['Pick or try a plan in Wallet', 'On ₹3 a bill, add credit before it runs low (the first top-up includes the ₹599 setup)'] },
  { id: 'expenses', tab: 'expenses', icon: ReceiptText, title: 'Your team and running costs',
    text: 'Salaries and the venue’s bills, so the profit you see in Analytics is the real one.',
    todo: ['Add your team and record their pay', 'Log bills and expenses as they happen'] },
];

/** The steps for this venue: a welcome, its own sections in tour order, and a closing checklist. */
export function tourSteps(model: BusinessModel, allowed: Set<string>, labels: Record<string, string>, venueName: string): TourStep[] {
  const stay = model === 'stay';
  const middle = STEPS.filter((s) => !s.tab || allowed.has(s.tab)).map(({ stay: forStay, ...s }) => ({
    ...s, ...(stay ? forStay : {}), kicker: (s.tab && labels[s.tab]) || s.kicker || '',
  }));
  return [
    { id: 'welcome', icon: Sparkles, kicker: 'Welcome', title: `${venueName} is live`,
      text: 'A one-minute look at where everything is. Each step opens that section behind this card, so you can see it as you read.',
      todo: ['Where to set up your venue first', 'Where orders, bills and requests arrive', 'You can skip now and reopen the tour from the sidebar'] },
    ...middle,
    { id: 'done', tab: 'profile', icon: PartyPopper, kicker: 'You’re ready', title: 'Three things to do first',
      text: 'Do these now and you can serve your first guest today.',
      todo: ['Set your master PIN in My Profile', stay ? 'Add your room types and rooms' : 'Add your first dishes to the menu', stay ? 'Share your stay page link' : 'Print your table QR codes'] },
  ];
}
