import { describe, expect, it } from 'vitest';
import { growthFor, type GrowthInput } from './growth-math';

const input = (over: Partial<GrowthInput> = {}): GrowthInput => ({
  eventNights: 4, guestsPerEvent: 60, spendPerGuest: 700, redemptionsPerWeek: 30, offerBill: 900, servicesPerWeek: 12, servicePrice: 800, ...over,
});

describe('landing lift calculator', () => {
  it('adds up events, offers and services for a month', () => {
    const r = growthFor(input());
    expect(r.events).toBe(4 * 60 * 700);
    expect(r.offers).toBe(Math.round(30 * (52 / 12) * 900));
    expect(r.services).toBe(Math.round(12 * (52 / 12) * 800));
    expect(r.total).toBe(r.events + r.offers + r.services);
    expect(r.yearly).toBe(r.total * 12);
  });

  it('counts event guests into bills by party of three and charges ₹3 on each new bill', () => {
    const r = growthFor(input({ redemptionsPerWeek: 0 }));
    expect(r.bills).toBe(4 * 20);
    expect(r.fees).toBe(80 * 3);
  });

  it('gives nothing for levers left at zero', () => {
    expect(growthFor(input({ eventNights: 0, redemptionsPerWeek: 0, servicesPerWeek: 0 }))).toMatchObject({ total: 0, bills: 0, fees: 0 });
  });

  it('prices one event night on its own', () => {
    expect(growthFor(input()).perEventNight).toBe(42000);
  });
});
