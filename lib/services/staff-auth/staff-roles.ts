/**
 * The three staff roles a PIN login can have, where each one lands, and which host APIs each may call.
 * Pure data and string checks only: the middleware (edge runtime) imports this too.
 */
export type StaffRole = 'WAITER' | 'CHEF' | 'CASHIER';

export const STAFF_ROLES: readonly StaffRole[] = ['WAITER', 'CHEF', 'CASHIER'];

export function asStaffRole(value: unknown): StaffRole | null {
  const v = String(value ?? '').trim().toUpperCase();
  return (STAFF_ROLES as readonly string[]).includes(v) ? (v as StaffRole) : null;
}

export type Terminal = 'waiter' | 'kitchen' | 'cashier';

const TERMINAL: Record<StaffRole, Terminal> = { WAITER: 'waiter', CHEF: 'kitchen', CASHIER: 'cashier' };
export const terminalFor = (role: StaffRole): Terminal => TERMINAL[role];
/** `/pos/terminal?business_id=<venue>&tab=waiter|kitchen|cashier`: the page a signed-in staff member works in. */
export const terminalPath = (businessId: string, role: StaffRole) => `/pos/terminal?business_id=${businessId}&tab=${TERMINAL[role]}`;
/** `/pos/staff-login?business_id=<venue>[&tab=…]`: the PIN screen; a tab lists only the people with that role. */
export const gatewayPath = (businessId: string, tab?: Terminal | null) => `/pos/staff-login?business_id=${businessId}${tab ? `&tab=${tab}` : ''}`;
/** The role behind a `tab` value. `pos` is accepted for the cashier's billing terminal. */
export const roleForTerminal = (t: string): StaffRole | null =>
  STAFF_ROLES.find((r) => TERMINAL[r] === String(t).toLowerCase()) ?? (String(t).toLowerCase() === 'pos' ? 'CASHIER' : null);

type Rule = { prefix: string; methods: readonly string[] };
const READ = ['GET'] as const;
const READ_WRITE = ['GET', 'POST', 'PATCH'] as const;
const WRITE = ['POST', 'PATCH'] as const;

// What each role's terminal needs, and no more. A path matches a rule on its prefix, at a path boundary.
const SHARED_FLOOR: Rule[] = [
  { prefix: '/api/host/tables/items', methods: ['POST'] },
  { prefix: '/api/host/tables/lines', methods: WRITE },
  { prefix: '/api/host/tables', methods: READ },
  { prefix: '/api/host/sessions', methods: READ_WRITE },
  { prefix: '/api/host/catalog', methods: READ },
  { prefix: '/api/host/settings/waiter-settle', methods: READ },
];
const KITCHEN: Rule = { prefix: '/api/host/kitchen/tickets', methods: READ_WRITE };

const ALLOW: Record<StaffRole, Rule[]> = {
  WAITER: [...SHARED_FLOOR, KITCHEN],
  CHEF: [KITCHEN],
  CASHIER: [
    ...SHARED_FLOOR,
    KITCHEN,
    { prefix: '/api/host/orders/create', methods: ['POST'] },
    { prefix: '/api/host/orders/history', methods: READ },
    { prefix: '/api/host/accommodations/rooms', methods: READ },
    { prefix: '/api/host/wallet/redeem', methods: READ_WRITE },
    { prefix: '/api/host/wallet/guest', methods: READ },
    { prefix: '/api/host/gst-status', methods: READ },
    { prefix: '/api/host/profile', methods: READ },
    // The read-only Vibey co-pilot. Locked sections stay locked for a staff sign-in whatever the screen claims.
    { prefix: '/api/host/vibey', methods: ['GET', 'POST'] },
  ],
};

const matches = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

/** Whether a signed-in staff member of `role` may make this request to the host API. Everything else is the owner's. */
export function staffMayCall(role: StaffRole, method: string, pathname: string): boolean {
  const m = method.toUpperCase();
  // The most specific rule wins, so a read-only /tables rule never widens /tables/items.
  const rule = [...ALLOW[role]].sort((a, b) => b.prefix.length - a.prefix.length).find((r) => matches(pathname, r.prefix));
  return Boolean(rule && rule.methods.includes(m));
}
