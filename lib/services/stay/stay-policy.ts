// The owner's early check-in and late check-out options: what time each opens or extends to, and its fee. Stored as
// businesses.stay_policies (jsonb), with the front desk contact beside them. Everything read from it is sanitised,
// because it is edited from a form and read by public pages. Fees and arrival parsing are in stay-policy-fees.ts.
import { NO_FRONT_DESK, readFrontDesk, frontDeskError, type FrontDesk } from './front-desk-policy';

export type { FrontDesk } from './front-desk-policy';
export { NO_FRONT_DESK, readFrontDesk } from './front-desk-policy';
export * from './stay-policy-fees';

export type PolicyKind = 'early_checkin' | 'late_checkout';
export type FeeType = 'flat' | 'percent';

export interface PolicyOption { id: string; label: string; time: string; fee_type: FeeType; value: number }
export interface StayPolicies { early_checkin: PolicyOption[]; late_checkout: PolicyOption[]; front_desk: FrontDesk }

export const EMPTY_POLICIES: StayPolicies = { early_checkin: [], late_checkout: [], front_desk: NO_FRONT_DESK };
export const MAX_OPTIONS = 6;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const ID = /^[a-z0-9-]{1,24}$/;

/** What the settings screen offers with one tap; the owner edits the values. */
export const STANDARD_POLICIES: StayPolicies = {
  early_checkin: [
    { id: 'early-10', label: 'Early check-in from 10:00', time: '10:00', fee_type: 'percent', value: 25 },
    { id: 'early-06', label: 'Early check-in from 06:00', time: '06:00', fee_type: 'percent', value: 50 },
  ],
  late_checkout: [
    { id: 'late-14', label: 'Late check-out until 14:00', time: '14:00', fee_type: 'percent', value: 25 },
    { id: 'late-18', label: 'Late check-out until 18:00', time: '18:00', fee_type: 'percent', value: 50 },
  ],
  front_desk: NO_FRONT_DESK,
};

function cleanOption(raw: any, kind: PolicyKind, index: number): PolicyOption | null {
  if (!raw || typeof raw !== 'object') return null;
  const time = typeof raw.time === 'string' ? raw.time.slice(0, 5) : '';
  const feeType: FeeType = raw.fee_type === 'flat' ? 'flat' : 'percent';
  const value = Number(raw.value);
  if (!HHMM.test(time) || !Number.isFinite(value) || value < 0) return null;
  if (feeType === 'percent' && value > 100) return null;
  if (feeType === 'flat' && value > 100_000) return null;
  const label = typeof raw.label === 'string' ? raw.label.replace(/\s+/g, ' ').trim().slice(0, 60) : '';
  const id = typeof raw.id === 'string' && ID.test(raw.id) ? raw.id : `${kind === 'early_checkin' ? 'early' : 'late'}-${time.replace(':', '')}-${index}`;
  return { id, label: label || (kind === 'early_checkin' ? `Early check-in from ${time}` : `Late check-out until ${time}`), time, fee_type: feeType, value: Math.round(value * 100) / 100 };
}

/** The stored policies, with anything malformed dropped. Never throws. */
export function readPolicies(raw: unknown): StayPolicies {
  const src: any = raw && typeof raw === 'object' ? raw : {};
  const list = (kind: PolicyKind): PolicyOption[] => {
    const seen = new Set<string>();
    return (Array.isArray(src[kind]) ? src[kind] : []).slice(0, MAX_OPTIONS)
      .map((o: unknown, i: number) => cleanOption(o, kind, i))
      .filter((o: PolicyOption | null): o is PolicyOption => Boolean(o) && !seen.has((o as PolicyOption).id) && Boolean(seen.add((o as PolicyOption).id)));
  };
  return { early_checkin: list('early_checkin'), late_checkout: list('late_checkout'), front_desk: readFrontDesk(src.front_desk) };
}

/** For saving: the same cleaning, but a rejected option is an error the owner sees, not silently dropped. */
export function validatePolicies(raw: unknown): { ok: true; policies: StayPolicies } | { ok: false; error: string } {
  const src: any = raw && typeof raw === 'object' ? raw : {};
  for (const kind of ['early_checkin', 'late_checkout'] as const) {
    const items = Array.isArray(src[kind]) ? src[kind] : [];
    if (items.length > MAX_OPTIONS) return { ok: false, error: `At most ${MAX_OPTIONS} ${kind === 'early_checkin' ? 'early check-in' : 'late check-out'} options.` };
    for (let i = 0; i < items.length; i++) {
      if (!cleanOption(items[i], kind, i)) return { ok: false, error: `${kind === 'early_checkin' ? 'Early check-in' : 'Late check-out'} option ${i + 1} needs a time (HH:MM) and a fee (a percentage up to 100, or a rupee amount).` };
    }
  }
  const deskError = frontDeskError(src.front_desk);
  if (deskError) return { ok: false, error: deskError };
  return { ok: true, policies: readPolicies(src) };
}
