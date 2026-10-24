import type { VideoId } from '@/lib/landing/videos';

export type VenueView = 'connected' | 'kot' | 'kitchen' | 'settle' | 'report';

export interface FlowStep {
  title: string;
  guest: string;
  venue: string;
  phone: VideoId;
  view: VenueView;
  ms: number;
}

/** One table's order, end to end: what the guest does in Vibers Connect and what the venue sees in Quad Computing. */
export const FLOW_STEPS: FlowStep[] = [
  { title: 'Scan the table QR', phone: 'guest-menu', view: 'connected', ms: 7000,
    guest: 'The venue’s menu opens in the phone’s browser. Nothing to install.',
    venue: 'Live Tables shows the table taken, with the guest’s name.' },
  { title: 'Order, or just ask Vibey', phone: 'guest-vibey', view: 'kot', ms: 7500,
    guest: '“2 cappuccino and something to share”: Vibey fills the tray in the guest’s own words.',
    venue: 'A kitchen ticket lands with every dish and note, and the bell rings.' },
  { title: 'The kitchen cooks, the guest watches', phone: 'guest-tracker', view: 'kitchen', ms: 7500,
    guest: 'The tracker moves from received to cooking to ready, live.',
    venue: 'The ticket goes to its station and moves from new to preparing to ready.' },
  { title: 'Bill, pay and earn 7%', phone: 'guest-tracker', view: 'settle', ms: 6500,
    guest: 'One tap asks for the bill; cashback lands in the guest’s wallet.',
    venue: 'The counter settles in cash, UPI or card, with GST on the receipt.' },
  { title: 'The day reports itself', phone: 'guest-lounge', view: 'report', ms: 7000,
    guest: 'Guests leave a postcard on the lounge wall and come back.',
    venue: 'Sales, GST, stock used by recipes and fees update on their own.' },
];
