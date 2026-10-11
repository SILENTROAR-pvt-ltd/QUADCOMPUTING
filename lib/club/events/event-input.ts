// Pure validation of an event or tour plan. Money arrives in rupees and leaves in paise.
import { cleanText } from '../identity/identity-rules';
import { containsProfanity } from '../identity/profanity';
import { toPaise } from '../money';
import type { BudgetLine, EventKind, ScheduleStep } from '../types';

type Result = { ok: true; row: Record<string, unknown> } | { ok: false; error: string };
const no = (error: string): Result => ({ ok: false, error });
const KINDS: EventKind[] = ['tour', 'event', 'short_plan'];
const DAY = 86_400_000;

function budgetLines(raw: unknown): BudgetLine[] | null {
  if (raw == null) return [];
  if (!Array.isArray(raw) || raw.length > 20) return null;
  const lines: BudgetLine[] = [];
  for (const item of raw) {
    const label = cleanText(item?.label, 60);
    const amount = toPaise(item?.amount);
    if (!label || amount == null) return null;
    lines.push({ label, amount });
  }
  return lines;
}

function schedule(raw: unknown): ScheduleStep[] | null {
  if (raw == null) return [{ label: 'Full payment', bps: 10_000 }];
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 6) return null;
  const steps = raw.map((s: any) => ({ label: cleanText(s?.label, 40) || '', bps: Math.round(Number(s?.percent) * 100) }));
  if (steps.some((s) => !s.label || !Number.isInteger(s.bps) || s.bps <= 0)) return null;
  return steps.reduce((a, s) => a + s.bps, 0) === 10_000 ? steps : null;
}

export function parseEvent(body: Record<string, any>, creatorId: string, now: Date = new Date()): Result {
  const title = cleanText(body.title, 120);
  if (!title || title.length < 4) return no('Give your plan a title of at least 4 characters.');
  if (containsProfanity(title)) return no('Please rephrase the title.');
  const kind = body.kind as EventKind;
  if (!KINDS.includes(kind)) return no('Choose tour, event or short plan.');

  const starts = new Date(body.starts_at), ends = new Date(body.ends_at);
  if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) return no('Choose start and end dates.');
  if (starts.getTime() < now.getTime() + 3600_000) return no('The plan must start at least an hour from now.');
  if (ends <= starts) return no('The end must be after the start.');
  if (ends.getTime() - starts.getTime() > 60 * DAY) return no('Plans can last up to 60 days.');

  const cancellation = cleanText(body.cancellation_policy, 2000), safety = cleanText(body.safety_protocol, 2000);
  if (!cancellation || cancellation.length < 20) return no('Describe the cancellation policy (at least 20 characters).');
  if (!safety || safety.length < 20) return no('Describe the safety protocol (at least 20 characters).');

  const priceMin = toPaise(body.price_min), priceMax = toPaise(body.price_max);
  if (priceMin == null || priceMax == null || priceMax < priceMin) return no('Set a stay budget range where the maximum is at least the minimum.');
  const ticket = toPaise(body.ticket_price);
  if (ticket == null) return no('Set the price per participant (0 for free).');
  const capacity = Math.round(Number(body.capacity));
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 5000) return no('Capacity must be between 1 and 5,000.');

  const budget = budgetLines(body.budget);
  if (!budget) return no('Each budget line needs a name and an amount (up to 20 lines).');
  const steps = schedule(body.payment_schedule);
  if (!steps) return no('Payment steps need names and percentages that add up to 100.');
  const covers = Array.isArray(body.cover_paths) ? body.cover_paths.filter((p: unknown) => typeof p === 'string' && p.startsWith(`events/${creatorId}/`)).slice(0, 8) : [];

  return {
    ok: true,
    row: {
      title, kind, starts_at: starts.toISOString(), ends_at: ends.toISOString(), venue: cleanText(body.venue, 300),
      transport: cleanText(body.transport, 1000), food: cleanText(body.food, 1000), activities: cleanText(body.activities, 1000),
      budget, cancellation_policy: cancellation, safety_protocol: safety, price_min: priceMin, price_max: priceMax,
      capacity, ticket_price: ticket, payment_schedule: steps, cover_paths: covers,
    },
  };
}
