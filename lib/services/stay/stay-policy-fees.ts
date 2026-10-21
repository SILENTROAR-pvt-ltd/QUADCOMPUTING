import type { PolicyKind, PolicyOption, StayPolicies } from './stay-policy';

// What an early check-in or late check-out option costs on a given room, and which option a guest's stated arrival
// points at. A fee is always computed on the server from the owner's rules, never taken from a client.

/** The fee for one option on a room whose nightly rate is `nightRate`: a flat amount, or a share of one night. */
export function policyFee(option: Pick<PolicyOption, 'fee_type' | 'value'>, nightRate: number): number {
  const fee = option.fee_type === 'flat' ? option.value : (Number(nightRate) || 0) * option.value / 100;
  return Math.max(0, Math.round(fee));
}

export const findOption = (p: StayPolicies, kind: PolicyKind, id: unknown): PolicyOption | null =>
  (typeof id === 'string' ? p[kind].find((o) => o.id === id) : null) || null;

export type ExpectedArrival = 'standard' | 'late' | `early:${string}`;

/** A guest's stated arrival, checked against the owner's options; anything else is "standard". */
export function readExpectedArrival(raw: unknown, p: StayPolicies): ExpectedArrival {
  if (raw === 'late') return 'late';
  if (typeof raw === 'string' && raw.startsWith('early:') && findOption(p, 'early_checkin', raw.slice(6))) return raw as ExpectedArrival;
  return 'standard';
}

export const earlyOptionOf = (arrival: string | null | undefined) => (arrival && arrival.startsWith('early:') ? arrival.slice(6) : null);

/** The instant an option's time falls on, on a given India-time date: "2026-10-22" + "14:00". */
export const istInstant = (date: string, time: string) => new Date(`${date}T${time}:00+05:30`).toISOString();
