import type { ScreenshotId } from '@/lib/landing/screenshots';
import { PAYG_BILL_FEE } from '@/lib/services/wallet/plans';

export interface TourStep {
  letter: string;
  id: string;
  title: string;
  lead: string;
  points: string[];
  shot: ScreenshotId;
  url: string;
  /** Show only the top of a tall screen, at this aspect ratio. */
  crop?: number;
}

/** The control centre, A to Z: each step is a real screen (sample café data) and what it answers for the owner. */
export const TOUR_STEPS: TourStep[] = [
  {
    letter: 'A', id: 'analytics', title: 'Analytics and reports', shot: 'overview', url: 'Control centre · Analytics & COGS',
    lead: 'Today, yesterday, 7 or 30 days, this month, 12 months or any custom range. Every figure comes from settled bills, in India time.',
    points: ['Total sales against the period before, settled bills, average bill and open bills', 'Sales summary: gross, discounts, net, GST, delivery fees and total collected', 'Sales by hour with the busiest hour named, and by weekday', 'Where sales came from (dine-in, delivery, counter), sales by category, and connected guests'],
  },
  {
    letter: 'B', id: 'pnl', title: 'Profit and loss, with every expense', shot: 'pnl', url: 'Analytics · Profit & loss', crop: 0.95,
    lead: 'A full statement for the same period, so net profit is never a guess.',
    points: ['Revenue without GST: net sales, delivery fees and other charges', 'Cost of goods: ingredients used by recipes, wastage and stock-count differences', 'Operating expenses: salaries, advances, rent, power, gas and every bill by category', `Platform fees at ₹${PAYG_BILL_FEE} a settled bill, then gross and net margin`],
  },
  {
    letter: 'C', id: 'stock', title: 'Top items and stock control', shot: 'items-stock', url: 'Analytics · Top items & stock',
    lead: 'What sells, and what is about to run out before the kitchen notices.',
    points: ['Best sellers by sales at menu price, with quantity and share', 'Ingredients that are out, critical or low against their reorder level', 'How much to buy to get back to the reorder level, one tap to Raw Inventory'],
  },
  {
    letter: 'D', id: 'dues', title: 'Dues: You earn, We earn', shot: 'dues', url: 'Control centre · Dues', crop: 1.6,
    lead: 'Both sides of the deal on one screen. You earn all of your revenue; we earn a flat fee per settled bill.',
    points: ['You earn: revenue from every settled bill, with the latest invoices', `We earn: ₹${PAYG_BILL_FEE} a settled bill, what is still due, and Settle & pay`, 'You earn against we earn, per-day bars for both, and how guests paid'],
  },
  {
    letter: 'E', id: 'slips', title: 'Daily due slips, 10 AM to 10 PM', shot: 'slip', url: 'Dues · Daily slip',
    lead: 'Each billing day closes at 10 PM with its own slip, ready to check, filter and print.',
    points: ['Bills, revenue, fees and fee due for the day', 'Filter by fee status, payment method or a search', 'Tap any bill to open its full invoice and print it'],
  },
  {
    letter: 'F', id: 'delivery', title: 'Delivery from your own menu', shot: 'delivery', url: 'Control centre · Delivery',
    lead: 'Guests order for delivery from the same QR menu, inside the radius and minimum order you set.',
    points: ['Your radius, minimum order and delivery fee', 'Cash on delivery or UPI paid in advance to your own QR', 'Received, preparing, out for delivery, delivered: one button each'],
  },
  {
    letter: 'G', id: 'vendors', title: 'Vendors and partners', shot: 'vendors', url: 'Control centre · Vendors',
    lead: 'Bike rentals, cabs, laundry and tours your guests ask for, kept with their QR and WhatsApp number.',
    points: ['Save each partner’s payment QR, number and notes', 'Share a guest’s order to the partner on WhatsApp in one tap', 'Add what the partner charged to the guest’s bill yourself'],
  },
];
