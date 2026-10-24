// The plan a new venue starts on, chosen at sign-up: the free month of M²-Pro or M¹-Pro, or Rhodium Pro per bill.
// Rooms and stays are a Rhodium feature, so a venue with rooms starts on Rhodium unless it picks otherwise.
import { businessModel } from '@/lib/venue/venue-model';

export const START_PLANS = ['m2_pro', 'm1_pro', 'rhodium_ppb'] as const;
export type StartPlan = (typeof START_PLANS)[number];

export const defaultStartPlan = (categories: unknown): StartPlan => (businessModel(categories) === 'food' ? 'm2_pro' : 'rhodium_ppb');
