import { describe, it, expect } from 'vitest';
import { billGrewAfterPayment, canTransition, guestPaymentLine, parseMethod, payableAfterWallet, remainingToPay } from './bill-payment.rules';

describe('adding to an order after paying', () => {
  it('owes only the new part, never the whole bill again', () => {
    expect(remainingToPay(250, 150)).toBe(100);
    expect(remainingToPay(150, 150)).toBe(0);
    expect(remainingToPay(100, 150)).toBe(0);
  });

  it('notices when the bill has grown past what was paid', () => {
    expect(billGrewAfterPayment(250, 150)).toBe(true);
    expect(billGrewAfterPayment(150, 150)).toBe(false);
    expect(billGrewAfterPayment(250, 0)).toBe(false);
  });

  it('ignores junk', () => {
    expect(remainingToPay(NaN as unknown as number, 5)).toBe(0);
    expect(remainingToPay(100, -20)).toBe(100);
  });
});

describe('choosing how to pay', () => {
  it('accepts only the three methods, in any case', () => {
    expect(parseMethod('upi')).toBe('UPI');
    expect(parseMethod(' Cash ')).toBe('CASH');
    expect(parseMethod('card')).toBe('CARD');
    expect(parseMethod('WALLET')).toBeNull();
    expect(parseMethod(undefined)).toBeNull();
  });
});

describe('what is left to pay after the wallet', () => {
  it('takes the wallet off the bill', () => {
    expect(payableAfterWallet(1250, 200)).toEqual({ amount: 1050, wallet: 200 });
  });

  it('never lets the wallet exceed the bill, or go negative', () => {
    expect(payableAfterWallet(150, 999)).toEqual({ amount: 0, wallet: 150 });
    expect(payableAfterWallet(150, -40)).toEqual({ amount: 150, wallet: 0 });
  });

  it('rounds to paise and ignores junk', () => {
    expect(payableAfterWallet(100.005, 0.1).amount).toBeCloseTo(99.91, 2);
    expect(payableAfterWallet(NaN as unknown as number, 5)).toEqual({ amount: 0, wallet: 0 });
  });
});

describe('a payment only moves forward', () => {
  it('goes chosen, claimed, verified, settled', () => {
    expect(canTransition('chosen', 'claimed')).toBe(true);
    expect(canTransition('claimed', 'verified')).toBe(true);
    expect(canTransition('verified', 'settled')).toBe(true);
  });

  it('lets staff confirm cash or card straight from chosen', () => {
    expect(canTransition('chosen', 'verified')).toBe(true);
  });

  it('never goes back, and a finished payment is final', () => {
    expect(canTransition('verified', 'claimed')).toBe(false);
    expect(canTransition('claimed', 'chosen')).toBe(false);
    expect(canTransition('settled', 'cancelled')).toBe(false);
    expect(canTransition('cancelled', 'chosen')).toBe(false);
  });
});

describe('the words the guest sees', () => {
  it('describes each stage', () => {
    expect(guestPaymentLine({ method: 'UPI', status: 'verified' })).toMatch(/confirmed/i);
    expect(guestPaymentLine({ method: 'UPI', status: 'claimed' })).toMatch(/confirming/i);
    expect(guestPaymentLine({ method: 'CASH', status: 'chosen' })).toMatch(/cash/i);
    expect(guestPaymentLine({ method: 'CARD', status: 'chosen' })).toMatch(/card/i);
  });
});
