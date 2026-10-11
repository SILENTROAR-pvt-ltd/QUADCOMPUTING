// A plan with an approved creator, a verified property and its owner, ready for deals and money.
import { createHmac } from 'node:crypto';
import { clubDb, member, seedMembers } from './fakes';
import type { PaymentGateway } from '@/lib/club/payments/razorpay';

export const CREATOR = '55555555-aaaa-4bbb-8ccc-00000000000c';
export const OWNER = '55555555-aaaa-4bbb-8ccc-00000000000e';
export const GUEST = '55555555-aaaa-4bbb-8ccc-00000000000a';
export const STAFF = '55555555-aaaa-4bbb-8ccc-0000000000ff';
export const EVENT = '55555555-eeee-4bbb-8ccc-000000000001';
export const PROPERTY = '55555555-pppp-4bbb-8ccc-000000000001';

export function moneyDb(eventOver: Record<string, unknown> = {}, settings: Array<{ key: string; value: unknown }> = []) {
  const creator = member(CREATOR, '@cara'), owner = member(OWNER, '@owen', { account_type: 'business', business_name: 'Sea Shack' }), guest = member(GUEST, '@gita');
  const db = clubDb({
    ...seedMembers(creator, owner, guest),
    club_events: [{
      id: EVENT, creator_id: CREATOR, title: 'Goa sunset tour', kind: 'tour', cover_paths: [], starts_at: '2030-01-10T10:00:00Z', ends_at: '2030-01-12T10:00:00Z',
      budget: [], cancellation_policy: 'x', safety_protocol: 'y', price_min: 100000, price_max: 500000, capacity: 2, ticket_price: 1000000,
      payment_schedule: [{ label: 'Deposit', bps: 1000 }, { label: 'Balance', bps: 9000 }], fee_bps: null, status: 'approved', verified: false, created_at: '2026-10-01T00:00:00Z',
      ...eventOver,
    }],
    property_marketplace: [{ id: PROPERTY, owner_id: OWNER, business_id: null, name: 'Sea Shack', categories: ['hotel'], capacity: 30, price_min: 100000, price_max: 500000, amenities: [], status: 'verified' }],
    club_settings: settings, club_offers: [], club_offer_revisions: [], club_agreements: [], club_payments: [], club_payouts: [], club_notifications: [],
    club_event_participants: [], club_rooms: [], club_room_members: [], club_ledger_accounts: [], club_journal: [], escrow_ledger: [], club_nocs: [], club_webhook_events: [],
  });
  return { db, creator: creator.profile as any, owner: owner.profile as any, guest: guest.profile as any };
}

export const KEY_SECRET = 'test_key_secret';
export const WEBHOOK_SECRET = 'test_webhook_secret';

export function fakeGateway(): PaymentGateway & { orders: number } {
  let n = 0;
  const hmac = (secret: string, payload: string) => createHmac('sha256', secret).update(payload).digest('hex');
  return {
    keyId: 'rzp_test_key',
    orders: 0,
    async createOrder() { this.orders += 1; n += 1; return { orderId: `order_${n}` }; },
    verifyCheckout: (o, p, s) => hmac(KEY_SECRET, `${o}|${p}`) === s,
    verifyWebhook: (body, s) => hmac(WEBHOOK_SECRET, body) === s,
  };
}

export const webhookSignature = (body: string) => createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
