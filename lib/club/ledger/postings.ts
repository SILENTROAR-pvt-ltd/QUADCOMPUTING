// The three journals the Club posts, as pure line builders (account ids in, balanced lines out).
//   capture:  Dr platform cash  /  Cr event escrow (net) + Cr club revenue (fee)
//   allocate: Dr event escrow   /  Cr vendor payable          (payout approved)
//   payout:   Dr vendor payable /  Cr platform cash           (money sent to the vendor)
import { bpsOf } from '../money';
import type { Line } from './journal';

export function captureLines(acc: { cash: string; escrow: string; revenue: string }, amount: number, feeBps: number): { lines: Line[]; fee: number } {
  const fee = bpsOf(amount, feeBps);
  const lines: Line[] = [{ account_id: acc.cash, debit: amount }, { account_id: acc.escrow, credit: amount - fee }];
  if (fee > 0) lines.push({ account_id: acc.revenue, credit: fee });
  return { lines, fee };
}

export function allocateLines(escrow: string, payable: string, amount: number): Line[] {
  return [{ account_id: escrow, debit: amount }, { account_id: payable, credit: amount }];
}

export function payoutLines(payable: string, cash: string, amount: number): Line[] {
  return [{ account_id: payable, debit: amount }, { account_id: cash, credit: amount }];
}
