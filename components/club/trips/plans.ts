import { Coffee, Mountain, PartyPopper, type LucideIcon } from 'lucide-react';

/** A plan as the list API returns it, with who is going and where the viewer stands. */
export interface PlanCard {
  id: string;
  title: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  venue: string | null;
  status: string;
  verified: boolean;
  ticket_price: number;
  capacity: number;
  cover: string | null;
  going: number;
  interested: number;
  people: number;
  faces: Array<{ name: string; avatar_url: string | null }>;
  host: { user_id: string; name: string; city: string; avatar_url: string | null } | null;
  me: { hosting: boolean; going: boolean; interested: boolean };
}

export interface KindMeta { key: string; label: string; plural: string; icon: LucideIcon; emoji: string }

export const KINDS: KindMeta[] = [
  { key: 'tour', label: 'Tour', plural: 'Tours', icon: Mountain, emoji: '🏔️' },
  { key: 'event', label: 'Event', plural: 'Events', icon: PartyPopper, emoji: '🎉' },
  { key: 'short_plan', label: 'Short plan', plural: 'Short plans', icon: Coffee, emoji: '☕' },
];

export const KIND_LABEL: Record<string, string> = Object.fromEntries(KINDS.map((k) => [k.key, k.label]));
export const kindOf = (key: string) => KINDS.find((k) => k.key === key) ?? KINDS[1];

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** "Today · 6:30 pm", "Tomorrow · 9:00 am", or "Sat, 18 Oct · 7:00 pm". */
export function whenLabel(iso: string, now = new Date()) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const tomorrow = new Date(now.getTime() + 86_400_000);
  const dayText = sameDay(d, now) ? 'Today' : sameDay(d, tomorrow) ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${dayText} · ${time}`;
}
