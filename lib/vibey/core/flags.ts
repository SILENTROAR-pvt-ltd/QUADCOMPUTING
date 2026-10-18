// Who gets Vibey. Off unless switched on for a venue: by the venue's own flag (businesses.vibey_guest_enabled /
// vibey_host_enabled, added by the vibey migration) or by listing the venue in VIBEY_PILOT_VENUES (comma-separated ids,
// or * for every venue), which works before the migration is applied. VIBEY_ENABLED=0 switches it off everywhere.
import { checkRateLimit } from '@/lib/middleware/rate-limiter';
import { vibeyEnabled } from './llm';

export interface VibeyFlags { guest: boolean; host: boolean }

export function vibeyFlags(business: { id?: string; vibey_guest_enabled?: unknown; vibey_host_enabled?: unknown } | null | undefined): VibeyFlags {
  if (!vibeyEnabled() || !business?.id) return { guest: false, host: false };
  const pilots = (process.env.VIBEY_PILOT_VENUES || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const pilot = pilots.includes('*') || pilots.includes(String(business.id).toLowerCase());
  return { guest: business.vibey_guest_enabled === true || pilot, host: business.vibey_host_enabled === true || pilot };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** How many model calls one venue may make per day, per surface. Past it Vibey keeps working on rules alone. */
export function dailyModelBudget(): number {
  const n = Number(process.env.VIBEY_DAILY_MODEL_CALLS);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 1500;
}

/** Spends one model call from the venue's daily budget; false once it is used up. Shared across instances via Redis. */
export async function spendModelBudget(businessId: string, surface: 'guest' | 'host'): Promise<boolean> {
  const limit = dailyModelBudget();
  if (limit === 0) return false;
  const result = await checkRateLimit({ key: `vibey_budget:${surface}:${businessId}`, limit, windowMs: DAY_MS });
  return result.allowed;
}
