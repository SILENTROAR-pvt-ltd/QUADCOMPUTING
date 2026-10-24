import type { Level } from '../ui/StatusPill';

export interface PeriodTotals {
  gmv: number; orders: number; tax: number; stay: number; fnb: number; venues: number; avgBill: number; newVenues: number;
  income: { fees: number; payments: number; total: number };
}

export interface OverviewAnswer {
  asOf: string;
  days: number;
  source: 'sql' | 'scan';
  current: PeriodTotals;
  previous: PeriodTotals;
  venuesTotal: number;
  series: Array<{ day: string; gmv: number; orders: number; stay: number; fnb: number }>;
  topVenues: Array<{ venue_id: string; name: string; city: string | null; gmv: number; orders: number }>;
  latestPayments: Array<{ id: string; venue: string; amount: number; request_type: string | null; requested_plan_tier: string | null; status: string; utr_number: string; created_at: string }>;
  newestVenues: Array<{ id: string; name: string; city: string | null; createdAt: string; plan: string; categories: string[] }>;
  floor: { openTables: number | null; guestsOnline: number | null; staffToday: number | null; roomsOccupied: number | null };
  queues: { pendingPayments: number | null; openTickets: number | null; pendingReviews: number | null };
  plans: { mix: Record<'yewe' | 'm1' | 'm2' | 'rhodium' | 'legacy', number>; trials: number; grace: number; suspended: number; vibey: number };
  health: { overall: Level; at: string; checks: Array<{ id: string; label: string; level: Level; ms: number | null; detail: string }> };
}
