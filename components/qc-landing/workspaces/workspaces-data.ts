import { BarChart3, Banknote, BedDouble, BookOpen, Boxes, CalendarDays, ChefHat, CreditCard, LayoutGrid, ReceiptText, Store, Truck, UserRound, Users, Wallet, type LucideIcon } from 'lucide-react';

export type Role = 'owner' | 'floor' | 'kitchen' | 'desk';

export const ROLES: { id: Role | 'all'; label: string }[] = [
  { id: 'all', label: 'Everyone' },
  { id: 'owner', label: 'Owner' },
  { id: 'floor', label: 'Counter & floor' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'desk', label: 'Front desk' },
];

export interface Workspace { icon: LucideIcon; name: string; text: string; roles: Role[] }

// The control centre's workspaces, in the order of its navigation bar, with the people who mostly live in each.
export const WORKSPACES: Workspace[] = [
  { icon: UserRound, name: 'My Profile', roles: ['owner'], text: 'Venue details, hours, delivery and booking terms, and a PIN lock for shared screens.' },
  { icon: Wallet, name: 'Subscription & Wallet', roles: ['owner'], text: 'Yearly plans or ₹3 a bill from prepaid credit, with a clear statement.' },
  { icon: Banknote, name: 'Dues', roles: ['owner'], text: 'You earn against we earn, daily 10 AM to 10 PM slips, every invoice a tap away.' },
  { icon: BarChart3, name: 'Analytics & COGS', roles: ['owner'], text: 'A-to-Z reports for any range and a full profit and loss with every expense.' },
  { icon: BookOpen, name: 'Menu Catalog', roles: ['owner', 'kitchen'], text: 'Categories, add-ons, dish photos and recipes linked to raw stock.' },
  { icon: CreditCard, name: 'Billing & Tables', roles: ['floor', 'owner'], text: 'Counter and table billing with GST-ready receipts, cash, UPI or card.' },
  { icon: LayoutGrid, name: 'Live Tables', roles: ['floor'], text: 'Every table’s guests, orders and bill requests; free a table in one tap.' },
  { icon: CalendarDays, name: 'Reservations', roles: ['floor', 'desk'], text: 'Table bookings from the guest menu: confirm, seat or cancel from one list.' },
  { icon: Truck, name: 'Delivery', roles: ['floor', 'kitchen'], text: 'Orders inside your radius, COD or UPI in advance, tracked to the door.' },
  { icon: BedDouble, name: 'Accommodations', roles: ['desk'], text: 'Front desk, check-in, room services and check-out in one place.' },
  { icon: ChefHat, name: 'Live Kitchen (KOT)', roles: ['kitchen'], text: 'Tickets route to stations and move from new to preparing to ready.' },
  { icon: Boxes, name: 'Raw Inventory', roles: ['kitchen', 'owner'], text: 'Stock with reorder levels, wastage and counts, deducted by recipes.' },
  { icon: ReceiptText, name: 'Staff & Expenses', roles: ['owner'], text: 'Team, salaries, advances and daily bills, all inside the P&L.' },
  { icon: Users, name: 'My Guests', roles: ['owner', 'desk'], text: 'Every connected guest: visits, spend and who keeps coming back.' },
  { icon: Store, name: 'Vendors', roles: ['desk', 'owner'], text: 'Partners’ QR and WhatsApp, with guest orders shared in one tap.' },
];
