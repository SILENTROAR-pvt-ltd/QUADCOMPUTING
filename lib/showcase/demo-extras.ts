/** Deliveries, vendors and guest-menu dishes for the fictional café's screenshots. All names and numbers are made up. */
import { seeded } from './demo-orders';

export const deliveries = [
  { id: 'dlv-1', table_number: 'DLV-7F3A21C9', created_at: '2026-10-15T14:02:00.000Z', customer_name: 'Riya Sen', grand_total: 836,
    items: [{ name: 'Butter Chicken Rice', quantity: 1 }, { name: 'Pesto Pasta', quantity: 1 }], delivery_address: 'Flat 4B, Palm Residency, Sector 21',
    delivery_phone: '+91 90000 00021', delivery_distance_km: 2.4, delivery_fee: 40, delivery_payment: 'upi_advance' as const, delivery_paid: true, delivery_status: 'preparing' as const },
  { id: 'dlv-2', table_number: 'DLV-1C88E04B', created_at: '2026-10-15T14:09:00.000Z', customer_name: 'Neel Joshi', grand_total: 418,
    items: [{ name: 'Margherita Pizza', quantity: 1 }], delivery_address: '12 Lake View Road, near the old post office',
    delivery_phone: '+91 90000 00047', delivery_distance_km: 3.8, delivery_fee: 40, delivery_payment: 'cod' as const, delivery_paid: false, delivery_status: 'received' as const },
  { id: 'dlv-3', table_number: 'DLV-9B02D7E5', created_at: '2026-10-15T13:41:00.000Z', customer_name: 'Myra Verma', grand_total: 667,
    items: [{ name: 'Avocado Toast', quantity: 1 }, { name: 'Cold Brew', quantity: 2 }], delivery_address: 'House 7, Green Avenue, Block C',
    delivery_phone: '+91 90000 00063', delivery_distance_km: 1.6, delivery_fee: 40, delivery_payment: 'upi_advance' as const, delivery_paid: true, delivery_status: 'out_for_delivery' as const },
];

/** A QR-like pattern drawn from a seed (finder squares in three corners). It is a picture only and encodes nothing. */
export function demoQr(seed: number, size = 25): string {
  const rand = seeded(seed);
  const corners = [[0, 0], [size - 7, 0], [0, size - 7]];
  const ring = (x: number, y: number, fx: number, fy: number) => {
    const dx = x - fx, dy = y - fy;
    const edge = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
    return edge === 3 || edge <= 1;
  };
  let cells = '';
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const corner = corners.find(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);
    const on = corner ? ring(x, y, corner[0], corner[1]) : rand() < 0.48;
    if (on) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 ${size + 4} ${size + 4}"><rect x="-2" y="-2" width="${size + 4}" height="${size + 4}" fill="#fff"/><g fill="#111">${cells}</g></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const vendors = [
  { id: 'v1', name: 'Hilltop Bike Rentals', category: 'bike_rental' as const, whatsapp_phone: '919000000101', qr_image: demoQr(11),
    notes: 'Scooters and geared bikes, helmet included. Pays 10% on every booking we send.', created_at: '2026-10-01T10:00:00.000Z' },
  { id: 'v2', name: 'Valley Cabs', category: 'taxi' as const, whatsapp_phone: '919000000102', qr_image: demoQr(23),
    notes: 'Airport and station drops, 24 hours.', created_at: '2026-10-02T10:00:00.000Z' },
  { id: 'v3', name: 'Fresh Fold Laundry', category: 'laundry' as const, whatsapp_phone: '919000000103', qr_image: demoQr(37),
    notes: 'Same-day wash and iron, picked up from the front desk.', created_at: '2026-10-03T10:00:00.000Z' },
];

const photo = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=480&h=480&q=70`;

/** Four dishes for the guest menu screenshot. */
export const guestDishes = [
  { id: 'g1', name: 'Cappuccino', description: 'Double shot, steamed milk, a light cocoa dust.', price: 180, category: 'Coffee', image_url: photo('1509042239860-f550ce710b93') },
  { id: 'g2', name: 'Chef’s Signature Plate', description: 'Today’s plated special, finished with micro-greens.', price: 420, category: 'Mains', image_url: photo('1414235077428-338989a2e8c0') },
  { id: 'g3', name: 'Grilled Skewers', description: 'Chargrilled over open flame, with mint chutney.', price: 360, category: 'Mains', image_url: photo('1603088549155-6ae9395b928f') },
  { id: 'g4', name: 'Coffee for Two', description: 'Two flat whites, poured to order.', price: 320, category: 'Coffee', image_url: photo('1495474472287-4d71bcdd2085') },
  { id: 'g5', name: 'Big Breakfast Board', description: 'Eggs, beans, sausages, sourdough and greens.', price: 460, category: 'Breakfast', image_url: '/media/lounge/lounge-flatlay-v1.webp' },
  { id: 'g6', name: 'Seafood Paella', description: 'Saffron rice, prawns and mussels, for two.', price: 540, category: 'Mains', image_url: '/media/lounge/lounge-feast-v1.webp' },
];
