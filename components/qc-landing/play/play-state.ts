// The playable table on the landing page: the visitor is the guest and then the venue, one order end to end. Pure, so
// every step is tested. Amounts follow the product: 5% GST on food, 7% cashback to the guest, ₹3 a settled bill.

export interface PlayDish { id: string; name: string; price: number; image: string }

export const PLAY_MENU: PlayDish[] = [
  { id: 'cap', name: 'Cappuccino', price: 180, image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=240&h=240&q=60' },
  { id: 'skw', name: 'Grilled Skewers', price: 360, image: 'https://images.unsplash.com/photo-1603088549155-6ae9395b928f?auto=format&fit=crop&w=240&h=240&q=60' },
  { id: 'brk', name: 'Breakfast Board', price: 460, image: '/media/lounge/lounge-flatlay-v1.webp' },
  { id: 'pae', name: 'Seafood Paella', price: 540, image: '/media/lounge/lounge-feast-v1.webp' },
];

export type Stage = 'ordering' | 'new' | 'preparing' | 'ready' | 'settled';

export interface PlayState {
  stage: Stage;
  cart: Record<string, number>;
  table: number;
  ticket: number;
  day: { bills: number; sales: number; fees: number; cashback: number };
}

export const START_PLAY: PlayState = { stage: 'ordering', cart: {}, table: 4, ticket: 142, day: { bills: 0, sales: 0, fees: 0, cashback: 0 } };

export type PlayAction = { type: 'add' | 'remove'; id: string } | { type: 'send' | 'prepare' | 'ready' | 'settle' | 'next' };

const round2 = (n: number) => Math.round(n * 100) / 100;

export function billOf(cart: Record<string, number>) {
  const subtotal = PLAY_MENU.reduce((a, d) => a + d.price * (cart[d.id] ?? 0), 0);
  const gst = round2(subtotal * 0.05);
  const total = round2(subtotal + gst);
  return { subtotal, gst, total, cashback: round2(total * 0.07), items: Object.values(cart).reduce((a, n) => a + n, 0) };
}

export function playReducer(s: PlayState, a: PlayAction): PlayState {
  switch (a.type) {
    case 'add':
      return s.stage === 'ordering' ? { ...s, cart: { ...s.cart, [a.id]: (s.cart[a.id] ?? 0) + 1 } } : s;
    case 'remove':
      return s.stage === 'ordering' ? { ...s, cart: { ...s.cart, [a.id]: Math.max(0, (s.cart[a.id] ?? 0) - 1) } } : s;
    case 'send':
      return s.stage === 'ordering' && billOf(s.cart).items > 0 ? { ...s, stage: 'new' } : s;
    case 'prepare':
      return s.stage === 'new' ? { ...s, stage: 'preparing' } : s;
    case 'ready':
      return s.stage === 'preparing' ? { ...s, stage: 'ready' } : s;
    case 'settle': {
      if (s.stage !== 'ready') return s;
      const b = billOf(s.cart);
      return { ...s, stage: 'settled', day: { bills: s.day.bills + 1, sales: round2(s.day.sales + b.total), fees: s.day.fees + 3, cashback: round2(s.day.cashback + b.cashback) } };
    }
    case 'next':
      return s.stage === 'settled' ? { ...s, stage: 'ordering', cart: {}, table: s.table === 9 ? 1 : s.table + 1, ticket: s.ticket + 1 } : s;
    default:
      return s;
  }
}

/** The one thing to do next, said to the visitor, and which side of the screen it happens on. */
export const NEXT_HINT: Record<Stage, { side: 'guest' | 'venue'; text: string }> = {
  ordering: { side: 'guest', text: 'You are the guest at the table. Tap + on a dish or two, then send it to the kitchen.' },
  new: { side: 'venue', text: 'The ticket just reached the kitchen. Now you are the chef: start preparing.' },
  preparing: { side: 'venue', text: 'The guest is watching it cook. Mark it ready when it is plated.' },
  ready: { side: 'venue', text: 'It is on the table. Settle the bill at the counter.' },
  settled: { side: 'venue', text: 'Settled: the day’s numbers moved by themselves. Seat the next table?' },
};
