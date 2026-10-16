/**
 * A fictional café, "The Juniper Table", and two weeks of its bills, for the product screenshots on the landing pages.
 * Every name, dish and number here is made up. The bills are generated from a fixed seed, so the screenshots come out
 * the same each time they are captured, and they go through the same report builders as a real venue's bills.
 */

export const DEMO_VENUE = { name: 'The Juniper Table', id: 'd3m0c4fe-0000-4000-8000-00000000j7t1' } as const;

export interface DemoDish { id: string; name: string; price: number; category: string }

export const DEMO_MENU: DemoDish[] = [
  { id: 'cap', name: 'Cappuccino', price: 180, category: 'Coffee' },
  { id: 'brew', name: 'Cold Brew', price: 220, category: 'Coffee' },
  { id: 'chai', name: 'Masala Chai', price: 90, category: 'Coffee' },
  { id: 'avo', name: 'Avocado Toast', price: 320, category: 'Breakfast' },
  { id: 'oml', name: 'Masala Omelette', price: 210, category: 'Breakfast' },
  { id: 'pan', name: 'Pancake Stack', price: 260, category: 'Breakfast' },
  { id: 'bowl', name: 'Paneer Tikka Bowl', price: 340, category: 'Mains' },
  { id: 'bcr', name: 'Butter Chicken Rice', price: 390, category: 'Mains' },
  { id: 'pasta', name: 'Pesto Pasta', price: 360, category: 'Mains' },
  { id: 'pizza', name: 'Margherita Pizza', price: 420, category: 'Mains' },
  { id: 'tira', name: 'Tiramisu', price: 280, category: 'Desserts' },
  { id: 'brownie', name: 'Brownie Sundae', price: 240, category: 'Desserts' },
  { id: 'soda', name: 'Fresh Lime Soda', price: 120, category: 'Drinks' },
  { id: 'lassi', name: 'Mango Lassi', price: 150, category: 'Drinks' },
];

const FIRST = ['Aanya', 'Kabir', 'Meera', 'Rohan', 'Tara', 'Vivaan', 'Isha', 'Arjun', 'Zoya', 'Dev', 'Riya', 'Neel', 'Sara', 'Ishaan', 'Myra', 'Advik', 'Kiara', 'Reyansh'];
const LAST = ['Mehra', 'Sethi', 'Iyer', 'Das', 'Kapoor', 'Rao', 'Nair', 'Bhatt', 'Khan', 'Malhotra', 'Sen', 'Joshi', 'Thomas', 'Gill', 'Verma', 'Shah'];
const nameAt = (n: number) => `${FIRST[n % FIRST.length]} ${LAST[Math.floor(n / FIRST.length) % LAST.length]}`;
// A café's guests: a circle of regulars, many first-timers, and walk-ins who leave no name.
const guestName = (rand: () => number) => {
  const roll = rand();
  if (roll < 0.4) return nameAt(Math.floor(rand() * 48));
  if (roll < 0.72) return nameAt(48 + Math.floor(rand() * 230));
  return 'Guest';
};

// Bills per hour of the day (IST), shaped like a café: a lunch peak and a bigger dinner peak.
const HOUR_WEIGHT: Array<[number, number]> = [[10, 2], [11, 3], [12, 5], [13, 7], [14, 5], [15, 3], [16, 3], [17, 4], [18, 5], [19, 7], [20, 8], [21, 5]];

/** A small seeded random generator (mulberry32), so the same seed gives the same café every time. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const pickWeighted = (rand: () => number, weights: Array<[number, number]>) => {
  let roll = rand() * weights.reduce((a, [, w]) => a + w, 0);
  for (const [v, w] of weights) { roll -= w; if (roll <= 0) return v; }
  return weights[weights.length - 1][0];
};
const hex = (rand: () => number, n: number) => Array.from({ length: n }, () => Math.floor(rand() * 16).toString(16)).join('');
const uuid = (rand: () => number) => `${hex(rand, 8)}-${hex(rand, 4)}-4${hex(rand, 3)}-8${hex(rand, 3)}-${hex(rand, 12)}`;

/** One billing day of bills. `day` is the IST date (YYYY-MM-DD); `last` stops the day at that IST hour (today, so far). */
export function demoDayOrders(day: string, bills: number, seed: number, last = 22) {
  const rand = seeded(seed);
  const [y, m, d] = day.split('-').map(Number);
  const orders: any[] = [];
  for (let i = 0; i < bills; i += 1) {
    const hour = pickWeighted(rand, HOUR_WEIGHT.filter(([h]) => h < last));
    const created = new Date(Date.UTC(y, m - 1, d, hour - 5, Math.floor(rand() * 60) - 30, Math.floor(rand() * 60)));
    const lines = Array.from({ length: 1 + Math.floor(rand() * 3) }, () => {
      const dish = DEMO_MENU[Math.floor(rand() * DEMO_MENU.length)];
      return { item_id: dish.id, name: dish.name, price: dish.price, qty: rand() < 0.3 ? 2 : 1, category: dish.category };
    });
    const subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
    const discount = rand() < 0.15 ? Math.round(subtotal * 0.1) : 0;
    const roll = rand();
    const isDelivery = roll < 0.12;
    const table = isDelivery ? `DLV-${hex(rand, 8).toUpperCase()}` : roll < 0.22 ? 'counter' : `T${1 + Math.floor(rand() * 12)}`;
    const deliveryFee = isDelivery ? 40 : 0;
    const tax = r2((subtotal - discount) * 0.05);
    const pay = rand();
    orders.push({
      id: uuid(rand), created_at: created.toISOString(), status: 'settled', table_number: table, is_delivery: isDelivery,
      customer_name: guestName(rand),
      payment_method: pay < 0.58 ? 'UPI' : pay < 0.83 ? 'CASH' : 'CARD',
      items: lines, subtotal, discount_amount: discount, tax_amount: tax, delivery_fee: deliveryFee,
      grand_total: r2(subtotal - discount + tax + deliveryFee),
    });
  }
  return orders.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
}

/** The IST dates of the `n` days ending on `lastDay`, oldest first. */
export function daysEnding(lastDay: string, n: number): string[] {
  const end = Date.parse(`${lastDay}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => new Date(end - (n - 1 - i) * 86_400_000).toISOString().slice(0, 10));
}
