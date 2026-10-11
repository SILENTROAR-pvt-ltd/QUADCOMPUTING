// The plan form's state, and conversion to and from the API (which speaks paise and ISO dates).
import type { Line } from './LineEditor';
import type { Photo } from '../PhotoUploader';

export interface EventForm {
  title: string; kind: 'tour' | 'event' | 'short_plan'; starts_at: string; ends_at: string; venue: string; transport: string; food: string;
  activities: string; cancellation_policy: string; safety_protocol: string; price_min: string; price_max: string; capacity: string;
  ticket_price: string; budget: Line[]; schedule: Line[]; covers: Photo[];
}

export const EMPTY_EVENT: EventForm = {
  title: '', kind: 'tour', starts_at: '', ends_at: '', venue: '', transport: '', food: '', activities: '', cancellation_policy: '',
  safety_protocol: '', price_min: '', price_max: '', capacity: '12', ticket_price: '', budget: [{ label: 'Stay', value: '' }],
  schedule: [{ label: 'Deposit', value: '10' }, { label: 'Balance', value: '90' }], covers: [],
};

const local = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const rupeesOf = (paise: number) => String(Number(paise || 0) / 100);

export function toPayload(f: EventForm) {
  return {
    title: f.title, kind: f.kind, starts_at: f.starts_at ? new Date(f.starts_at).toISOString() : '', ends_at: f.ends_at ? new Date(f.ends_at).toISOString() : '',
    venue: f.venue, transport: f.transport, food: f.food, activities: f.activities, cancellation_policy: f.cancellation_policy,
    safety_protocol: f.safety_protocol, price_min: f.price_min, price_max: f.price_max, capacity: f.capacity, ticket_price: f.ticket_price || '0',
    budget: f.budget.filter((b) => b.label.trim() || b.value).map((b) => ({ label: b.label, amount: b.value })),
    payment_schedule: f.schedule.map((s) => ({ label: s.label, percent: s.value })),
    cover_paths: f.covers.map((c) => c.path),
  };
}

export function fromEvent(e: any, coverUrls: string[]): EventForm {
  return {
    title: e.title, kind: e.kind, starts_at: local(e.starts_at), ends_at: local(e.ends_at), venue: e.venue || '', transport: e.transport || '',
    food: e.food || '', activities: e.activities || '', cancellation_policy: e.cancellation_policy, safety_protocol: e.safety_protocol,
    price_min: rupeesOf(e.price_min), price_max: rupeesOf(e.price_max), capacity: String(e.capacity), ticket_price: rupeesOf(e.ticket_price),
    budget: (e.budget || []).map((b: any) => ({ label: b.label, value: rupeesOf(b.amount) })),
    schedule: (e.payment_schedule || []).map((s: any) => ({ label: s.label, value: String(s.bps / 100) })),
    covers: (e.cover_paths || []).map((path: string, i: number) => ({ path, url: coverUrls[i] ?? null })),
  };
}
