import { BarChart3, ChefHat, Coins, LayoutGrid, ScanLine, UtensilsCrossed, type LucideIcon } from 'lucide-react';

export type Lane = 'guest' | 'venue';

export interface FlowStep {
  n: number;
  lane: Lane;
  who: string;
  title: string;
  text: string;
  icon: LucideIcon;
}

/** One order, end to end. Guest steps happen in Vibers Connect, venue steps in Quad Computing. */
export const FLOW_STEPS: FlowStep[] = [
  { n: 1, lane: 'guest', who: 'Guest', icon: ScanLine, title: 'Scan the table QR', text: 'Vibers Connect opens in the browser with the venue’s live menu.' },
  { n: 2, lane: 'guest', who: 'Guest', icon: UtensilsCrossed, title: 'Order and customise', text: 'Add-ons and notes go with the order, straight to the venue.' },
  { n: 3, lane: 'venue', who: 'Kitchen', icon: ChefHat, title: 'Kitchen ticket (KOT)', text: 'The ticket reaches the right station and moves from new to ready.' },
  { n: 4, lane: 'venue', who: 'Floor staff', icon: LayoutGrid, title: 'Live table and calls', text: 'Staff see each table, waiter calls and bill requests as they happen.' },
  { n: 5, lane: 'guest', who: 'Guest', icon: Coins, title: 'Pay and earn', text: 'Guests get their invoice, redeem wallet cashback and earn more.' },
  { n: 6, lane: 'venue', who: 'Owner', icon: BarChart3, title: 'Settle and report', text: 'Sales, Z-report and recipe-based stock deduction update themselves.' },
];

export const LANES: Record<Lane, { label: string; chip: string }> = {
  guest: { label: 'Guest · Vibers Connect', chip: 'border-[#e6d5b0] bg-[#fbf6ea] text-[#5c4520]' },
  venue: { label: 'Venue · Quad Computing', chip: 'border-black bg-black text-white' },
};
