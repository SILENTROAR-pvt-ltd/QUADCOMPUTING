import { BedDouble, ChefHat, CreditCard, Gift, LineChart, MonitorSmartphone, QrCode, RefreshCw, Smartphone, Sparkles, Truck, type LucideIcon } from 'lucide-react';

export interface LegacyRow { icon: LucideIcon; topic: string; ours: string; theirs: string }

// Quad Computing with Vibers Connect against the pattern of a typical counter-billing POS. No product is named: setups
// vary, so the legacy column says "often" or "usually" and describes the common pattern, never one vendor's offer.
export const LEGACY_ROWS: LegacyRow[] = [
  { icon: CreditCard, topic: 'How you pay', ours: '₹3 a settled bill, or one yearly fee. No per-device licences.', theirs: 'A licence per billing terminal, renewed every year; another counter, another licence.' },
  { icon: MonitorSmartphone, topic: 'Devices', ours: 'Any phone, tablet or laptop you already own, in the browser.', theirs: 'Usually a dedicated billing PC or terminal, often bought with the software.' },
  { icon: QrCode, topic: 'Guest ordering', ours: 'Table and room QR menu; the order reaches the kitchen with no waiter in between.', theirs: 'Often a paid add-on, or no guest ordering at all.' },
  { icon: Truck, topic: 'Delivery', ours: 'Your own delivery from your own menu, inside your radius, with no commission.', theirs: 'Mostly through aggregator apps, with their commission on every order.' },
  { icon: ChefHat, topic: 'Kitchen', ours: 'Live tickets by station on any screen, timed from new to ready.', theirs: 'Printed KOTs; kitchen screens often cost extra.' },
  { icon: BedDouble, topic: 'Rooms and stays', ours: 'Front desk, check-in, room service and the room bill in the same login.', theirs: 'A separate hotel system, with its own login and its own bill.' },
  { icon: Gift, topic: 'Loyalty', ours: '7% wallet cashback built in, redeemed on the guest’s next bill.', theirs: 'A separate loyalty tool, if there is one.' },
  { icon: Sparkles, topic: 'AI', ours: 'Vibey takes orders in the guest’s language and suggests what to share.', theirs: 'Not part of the till.' },
  { icon: LineChart, topic: 'Profit', ours: 'Recipe-based food cost, wastage, salaries and every expense in one profit and loss.', theirs: 'Sales reports; costing usually needs a separate inventory module.' },
  { icon: RefreshCw, topic: 'Updates', ours: 'New features reach every venue in the browser, with nothing to reinstall.', theirs: 'Upgrades and support often under a yearly maintenance contract.' },
  { icon: Smartphone, topic: 'Away from the counter', ours: 'The day, dues and stock on your phone, wherever you are.', theirs: 'Reports mostly at the counter PC.' },
];
