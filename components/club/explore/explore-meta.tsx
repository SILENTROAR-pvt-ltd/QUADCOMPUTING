import { Coffee, Flower2, Footprints, Laptop, Mountain, Music, Palette, PartyPopper, Ticket, Trophy, Users, Utensils, type LucideIcon } from 'lucide-react';
import { whenLabel } from '../trips/plans';

export interface TypeMeta {
  key: string;
  label: string;
  /** The filter chip's wording. */
  plural: string;
  icon: LucideIcon;
  /** Soft background for a card with no photo. */
  tint: string;
  /** Icon colour on that background. */
  ink: string;
}

/** Trips and events are reviewed plans; the rest are instant meetups. */
export const TYPES: TypeMeta[] = [
  { key: 'trip', label: 'Trip', plural: 'Trips', icon: Mountain, tint: 'from-[#dfe9c4] to-[#b9d09a]', ink: 'text-[#2f5d1f]' },
  { key: 'event', label: 'Event', plural: 'Events', icon: Ticket, tint: 'from-[#e6e0f3] to-[#cdc3e6]', ink: 'text-[#4b3a85]' },
  { key: 'coffee', label: 'Coffee & chai', plural: 'Coffee', icon: Coffee, tint: 'from-[#f3e3c3] to-[#e3c78f]', ink: 'text-[#7a5316]' },
  { key: 'food', label: 'Food', plural: 'Food', icon: Utensils, tint: 'from-[#f6dcc6] to-[#eab98e]', ink: 'text-[#8a4a17]' },
  { key: 'walk', label: 'Walk-around', plural: 'Walks', icon: Footprints, tint: 'from-[#d9ead6] to-[#b3d4ad]', ink: 'text-[#2f5d1f]' },
  { key: 'party', label: 'Party', plural: 'Parties', icon: PartyPopper, tint: 'from-[#f3d9ea] to-[#e3b3d1]', ink: 'text-[#8a2f68]' },
  { key: 'music', label: 'Music', plural: 'Music', icon: Music, tint: 'from-[#d9dff3] to-[#b4bfe6]', ink: 'text-[#2f3f8a]' },
  { key: 'sports', label: 'Sports & games', plural: 'Sports', icon: Trophy, tint: 'from-[#d4e8f1] to-[#a9d0e3]', ink: 'text-[#1d5a78]' },
  { key: 'dev', label: 'Developer meet', plural: 'Dev meets', icon: Laptop, tint: 'from-[#d8e3e2] to-[#aec7c5]', ink: 'text-[#25544f]' },
  { key: 'creative', label: 'Creative', plural: 'Creative', icon: Palette, tint: 'from-[#f4dadb] to-[#e6b3b6]', ink: 'text-[#8a2f37]' },
  { key: 'wellness', label: 'Wellness', plural: 'Wellness', icon: Flower2, tint: 'from-[#e1efe3] to-[#bddcc2]', ink: 'text-[#2f6b45]' },
  { key: 'together', label: 'Get-together', plural: 'Get-togethers', icon: Users, tint: 'from-[#eee6d3] to-[#dccfae]', ink: 'text-[#6b5a2a]' },
];

export const typeOf = (key: string): TypeMeta => TYPES.find((t) => t.key === key) ?? TYPES[11];

/** Types a member can start as an instant meetup (everything except trips and events). */
export const MEETUP_TYPES = TYPES.slice(2);

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

/** "Live now · until 6:30 pm", or "Today · 6:30 pm" / "Tomorrow · 9:00 am" / "Sat, 18 Oct · 7:00 pm". */
export function whenText(item: { live: boolean; starts_at: string; ends_at: string }) {
  return item.live ? `Live now · until ${time(item.ends_at)}` : whenLabel(item.starts_at);
}
