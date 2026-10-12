import { Bell, Building2, Globe, House, IdCard, MapPin, MessageSquare, Plane, Shield, type LucideIcon } from 'lucide-react';

export interface NavItem { href: string; label: string; icon: LucideIcon; also?: string[] }

/** The five tabs, in the order of the bottom bar. `also` lists pages that live under a tab. */
export const TABS: NavItem[] = [
  { href: '/club', label: 'Home', icon: House },
  { href: '/club/explore', label: 'Explore', icon: Plane, also: ['/club/properties'] },
  { href: '/club/events', label: 'Trips', icon: MapPin, also: ['/club/offers', '/club/noc'] },
  { href: '/club/community', label: 'Community', icon: Globe, also: ['/club/members'] },
  { href: '/club/chat', label: 'Messages', icon: MessageSquare },
];

/** Extra places in the desktop sidebar. */
export const MORE: NavItem[] = [
  { href: '/club/places', label: 'Places', icon: MapPin, also: ['/club/places'] },
  { href: '/club/properties', label: 'Stays', icon: Building2 },
  { href: '/club/notifications', label: 'Notifications', icon: Bell },
  { href: '/club/pass', label: 'Profile & Visa', icon: IdCard },
];

export const ADMIN: NavItem = { href: '/club/admin', label: 'Back office', icon: Shield };

const under = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

export function isActive(path: string, item: NavItem) {
  if (item.href === '/club') return path === '/club';
  return under(path, item.href) || (item.also ?? []).some((h) => under(path, h));
}
