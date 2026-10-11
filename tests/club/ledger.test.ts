import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({}) }));

import { moneyDb, fakeGateway, webhookSignature, CREATOR, OWNER, GUEST, STAFF, EVENT, PROPERTY } from './money-setup';
import { balanceError } from '@/lib/club/ledger/journal';
import { makeOffer, respondToOffer } from '@/lib/club/marketplace/offers.service';
import { startDeposit, startInstallment } from '@/lib/club/payments/checkout.service';
import { capturePayment } from '@/lib/club/payments/capture.service';
import { handleWebhook } from '@/lib/club/payments/webhook.service';
import { reserveSpot, nextInstallment } from '@/lib/club/events/participation.service';
import { approvePayout, markPayoutPaid, requestPayout } from '@/lib/club/payments/payouts.service';
import { eventStatement } from '@/lib/club/ledger/reconcile.service';
import { issueNoc, verifyNoc } from '@/lib/club/ledger/noc.service';

const sumBy = (db: any, side: 'debit' | 'credit') => db.tables.escrow_ledger.reduce((s: number, l: any) => s + l[side], 0);

async function lockedDeal(db: any, creator: any) {
  const offer = await makeOffer(db, creator, { event_id: EVENT, property_id: PROPERTY, rate: 40000, guests: 12, check_in: '2030-01-10', check_out: '2030-01-12' });
  return (await respondToOffer(db, OWNER, offer.id, { action: 'accept', version: 1 })).agreement;
}

describe('Journals', () => {
  it('must balance, with whole paise on one side per line', () => {
    expect(balanceError([{ account_id: 'a', debit: 100 }, { account_id: 'b', credit: 100 }])).toBeNull();
    expect(balanceError([{ account_id: 'a', debit: 100 }, { account_id: 'b', credit: 90 }])).toMatch(/must match/);
    expect(balanceError([{ account_id: 'a', debit: 100, credit: 100 }, { account_id: 'b', credit: 0 }])).toMatch(/either/);
    expect(balanceError([{ account_id: 'a', debit: 1.5 }, { account_id: 'b', credit: 1.5 }])).toMatch(/whole paise/);
    expect(balanceError([{ account_id: 'a', debit: 0 }])).toMatch(/two lines/);
  });
});

describe('Deposit: escrow, fee, verified plan', () => {
  it('captures once, splits the 10% fee to club revenue, locks the deal and verifies the plan', async () => {
    const { db, creator } = moneyDb();
    const gateway = fakeGateway();
    const agreement = await lockedDeal(db, creator);
    const { payment } = await startDeposit(db, gateway, creator, agreement.id);
    const again = await startDeposit(db, gateway, creator, agreement.id);
    expect(again.payment.gateway_order_id).toBe(payment.gateway_order_id);
    expect(gateway.orders).toBe(1);

    await capturePayment(db, payment.gateway_order_id, 'pay_1', 400_000);
    await capturePayment(db, payment.gateway_order_id, 'pay_1', 400_000);
    expect(db.tables.club_journal).toHaveLength(1);
    expect(sumBy(db, 'debit')).toBe(sumBy(db, 'credit'));
    const s = await eventStatement(db, EVENT);
    expect(s).toMatchObject({ collected: 400_000, fees: 40_000, heldInEscrow: 360_000 });
    expect(db.tables.club_agreements[0].status).toBe('deposit_paid');
    expect(db.tables.club_events[0].verified).toBe(true);
    await expect(startDeposit(db, gateway, creator, agreement.id)).rejects.toMatchObject({ code: 'already_paid' });
  });

  it('refuses a gateway amount that does not match, and payments without a gateway', async () => {
    const { db, creator } = moneyDb();
    const agreement = await lockedDeal(db, creator);
    await expect(startDeposit(db, null, creator, agreement.id)).rejects.toMatchObject({ status: 503 });
    const { payment } = await startDeposit(db, fakeGateway(), creator, agreement.id);
    await expect(capturePayment(db, payment.gateway_order_id, 'pay_x', 1)).rejects.toMatchObject({ code: 'amount_mismatch' });
    expect(db.tables.club_journal).toHaveLength(0);
  });

  it('a per-plan fee overrides the global one', async () => {
    const { db, creator } = moneyDb({ fee_bps: 500 });
    const agreement = await lockedDeal(db, creator);
    const { payment } = await startDeposit(db, fakeGateway(), creator, agreement.id);
    await capturePayment(db, payment.gateway_order_id, 'pay_1');
    expect((await eventStatement(db, EVENT)).fees).toBe(20_000);
  });
});

describe('Webhooks', () => {
  it('only a correctly signed delivery counts, and a repeat changes nothing', async () => {
    const { db, creator } = moneyDb();
    const gateway = fakeGateway();
    const agreement = await lockedDeal(db, creator);
    const { payment } = await startDeposit(db, gateway, creator, agreement.id);
    const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_9', order_id: payment.gateway_order_id, amount: 400_000, currency: 'INR' } } } });
    await expect(handleWebhook(db, gateway, body, 'bad', 'evt_1')).rejects.toMatchObject({ status: 401 });
    await handleWebhook(db, gateway, body, webhookSignature(body), 'evt_1');
    await handleWebhook(db, gateway, body, webhookSignature(body), 'evt_1');
    expect(db.tables.club_journal).toHaveLength(1);
    expect(db.tables.club_payments[0]).toMatchObject({ status: 'captured', gateway_payment_id: 'pay_9' });
    expect(db.tables.club_webhook_events).toHaveLength(1);
  });
});

describe('Participants pay on the plan\'s schedule', () => {
  it('deposit then balance, confirmed when paid in full; capacity is enforced', async () => {
    const { db, guest } = moneyDb({ capacity: 1 });
    const gateway = fakeGateway();
    expect(await reserveSpot(db, EVENT, guest, new Date('2029-12-01'))).toEqual({ status: 'reserved' });
    const first = await startInstallment(db, gateway, guest, EVENT);
    expect(first.payment).toMatchObject({ amount: 100_000, label: 'Deposit (1/2)' });
    await capturePayment(db, first.payment.gateway_order_id, 'p1');
    const second = await startInstallment(db, gateway, guest, EVENT);
    expect(second.payment).toMatchObject({ amount: 900_000, label: 'Balance (2/2)' });
    await capturePayment(db, second.payment.gateway_order_id, 'p2');
    expect(db.tables.club_event_participants[0]).toMatchObject({ paid: 1_000_000, status: 'confirmed' });
    await expect(startInstallment(db, gateway, guest, EVENT)).rejects.toMatchObject({ code: 'already_paid' });
    const other = moneyDb({ capacity: 1 });
    await reserveSpot(other.db, EVENT, other.guest, new Date('2029-12-01'));
    await expect(reserveSpot(other.db, EVENT, { ...other.owner }, new Date('2029-12-01'))).rejects.toMatchObject({ code: 'full' });
  });

  it('schedule maths always adds up to the ticket', () => {
    const event = { payment_schedule: [{ label: 'A', bps: 3333 }, { label: 'B', bps: 3333 }, { label: 'C', bps: 3334 }] };
    expect(nextInstallment(event, 1001, 0)).toMatchObject({ index: 1, amount: 333 });
    expect(nextInstallment(event, 1001, 333)).toMatchObject({ index: 2, amount: 333 });
    expect(nextInstallment(event, 1001, 666)).toMatchObject({ index: 3, amount: 335 });
    expect(nextInstallment(event, 1001, 1001)).toBeNull();
  });
});

describe('Payouts, reconciliation and the NOC', () => {
  it('cannot pay out more than escrow holds; settles to zero; issues a verifiable NOC once', async () => {
    const { db, creator } = moneyDb();
    const agreement = await lockedDeal(db, creator);
    const { payment } = await startDeposit(db, fakeGateway(), creator, agreement.id);
    await capturePayment(db, payment.gateway_order_id, 'pay_1');

    const tooMuch = await requestPayout(db, CREATOR, false, { event_id: EVENT, property_id: PROPERTY, amount: 4000 });
    expect(tooMuch.status).toBe('pending_approval');
    await expect(approvePayout(db, STAFF, tooMuch.id)).rejects.toMatchObject({ code: 'insufficient_funds' });

    const payout = await requestPayout(db, CREATOR, false, { event_id: EVENT, property_id: PROPERTY, amount: 3600, idempotency_key: 'payout-key-1' });
    const dup = await requestPayout(db, CREATOR, false, { event_id: EVENT, property_id: PROPERTY, amount: 3600, idempotency_key: 'payout-key-1' });
    expect(dup.id).toBe(payout.id);
    await approvePayout(db, STAFF, payout.id);
    await expect(issueNoc(db, CREATOR, EVENT, false)).rejects.toMatchObject({ status: 409 });
    await markPayoutPaid(db, STAFF, payout.id, 'UTR123456');
    db.tables.club_payouts = db.tables.club_payouts.filter((p: any) => p.id !== tooMuch.id);

    const s = await eventStatement(db, EVENT);
    expect(s).toMatchObject({ collected: 400_000, fees: 40_000, paidOut: 360_000, heldInEscrow: 0, owedToVendors: 0, reconciled: true });
    await expect(issueNoc(db, CREATOR, EVENT, false)).rejects.toMatchObject({ status: 409 });
    db.tables.club_events[0].status = 'completed';
    const noc = await issueNoc(db, CREATOR, EVENT, false);
    expect((await issueNoc(db, CREATOR, EVENT, false)).code).toBe(noc.code);
    expect(await verifyNoc(db, noc.code)).toMatchObject({ valid: true, payload: { title: 'Goa sunset tour', creator: '@cara', properties: ['Sea Shack'] } });
    db.tables.club_nocs[0].payload = { ...db.tables.club_nocs[0].payload, collected: 1 };
    expect((await verifyNoc(db, noc.code)).valid).toBe(false);
    expect(GUEST && OWNER).toBeTruthy();
  });

  it('a third-party service always waits for staff, even with approvals switched off', async () => {
    const { db } = moneyDb({}, [{ key: 'payout_requires_approval', value: false }]);
    const thirdParty = await requestPayout(db, CREATOR, false, { event_id: EVENT, payee_label: 'Local bus operator', amount: 100 });
    expect(thirdParty).toMatchObject({ status: 'pending_approval', third_party: true });
  });
});
