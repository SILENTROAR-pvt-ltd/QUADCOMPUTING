import { Activity, BarChart3, Building2, LayoutDashboard, LifeBuoy, Settings, Wallet, type LucideIcon } from 'lucide-react';

/** Which live count a sidebar item shows as a badge (from /api/admin/counts). */
export type BadgeKey = 'payments' | 'reviews' | 'tickets';
export interface NavItem { href: string; label: string; icon: LucideIcon; note: string; badge: BadgeKey | null }

/** The admin sections, grouped as in the sidebar. */
export const ADMIN_NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'General',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, note: 'The whole platform, live', badge: null },
      { href: '/admin/venues', label: 'Venues & plans', icon: Building2, note: 'Review, plans, suspensions and compliance', badge: 'reviews' },
      { href: '/admin/payments', label: 'Payments', icon: Wallet, note: 'Approvals, fees, dues and balances held', badge: 'payments' },
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3, note: 'GMV, leaderboard, peak hours and statutory exports', badge: null },
      { href: '/admin/support', label: 'Support', icon: LifeBuoy, note: 'Tickets from venues and live stays', badge: 'tickets' },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/admin/system', label: 'System', icon: Activity, note: 'Health, data, Vibey and announcements', badge: null },
      { href: '/admin/settings', label: 'Settings', icon: Settings, note: 'Your password, sessions and the admin log', badge: null },
    ],
  },
];

export const ADMIN_NAV: NavItem[] = ADMIN_NAV_GROUPS.flatMap((g) => g.items);

export const activeNav = (pathname: string): NavItem =>
  ADMIN_NAV.find((n) => (n.href === '/admin' ? pathname === '/admin' : pathname === n.href || pathname.startsWith(`${n.href}/`))) ?? ADMIN_NAV[0];
