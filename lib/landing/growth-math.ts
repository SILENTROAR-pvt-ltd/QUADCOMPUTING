import { PAYG_BILL_FEE } from '@/lib/services/wallet/plans';

// The landing page's lift calculator: what events, offers and booked services add to a month, from the venue's own
// numbers (nothing here is a promise or an average we claim). Pure and tested.

export interface GrowthInput {
  eventNights: number;
  guestsPerEvent: number;
  spendPerGuest: number;
  redemptionsPerWeek: number;
  offerBill: number;
  servicesPerWeek: number;
  servicePrice: number;
}

export const WEEKS_PER_MONTH = 52 / 12;
/** Guests are counted into bills one party of three at a time. */
export const PARTY = 3;

export interface GrowthResult {
  events: number;
  offers: number;
  services: number;
  /** Extra sales in a month, rupees. */
  total: number;
  yearly: number;
  /** New bills those sales arrive on (booked services go on bills already open, so they add none). */
  bills: number;
  /** The ₹3 a bill on those bills, on You earn, we earn (nothing on a yearly plan). */
  fees: number;
  /** One event night, for "a quiet night is worth". */
  perEventNight: number;
}

export function growthFor(g: GrowthInput): GrowthResult {
  const perEventNight = g.guestsPerEvent * g.spendPerGuest;
  const events = g.eventNights * perEventNight;
  const offers = Math.round(g.redemptionsPerWeek * WEEKS_PER_MONTH * g.offerBill);
  const services = Math.round(g.servicesPerWeek * WEEKS_PER_MONTH * g.servicePrice);
  const total = events + offers + services;
  const bills = Math.round(g.eventNights * Math.ceil(g.guestsPerEvent / PARTY) + g.redemptionsPerWeek * WEEKS_PER_MONTH);
  return { events, offers, services, total, yearly: total * 12, bills, fees: bills * PAYG_BILL_FEE, perEventNight };
}
