// Per-plan statement and reconciliation: money in, platform fees, payouts, what is still held in
// escrow and what is still owed to vendors. A plan reconciles when both of those are zero.
import { must } from '../http';
import { creditBalances, ensureAccount, escrowOf } from './journal';

export interface Statement {
  eventId: string;
  collected: number;
  fees: number;
  paidOut: number;
  heldInEscrow: number;
  owedToVendors: number;
  pendingPayouts: number;
  reconciled: boolean;
  journals: Array<{ id: string; kind: string; memo: string | null; created_at: string; lines: Array<{ account: string; debit: number; credit: number }> }>;
}

export async function eventStatement(db: any, eventId: string): Promise<Statement> {
  const escrowId = await ensureAccount(db, escrowOf(eventId));
  const accounts = must(await db.from('club_ledger_accounts').select('id, code, kind').or(`id.eq.${escrowId},event_id.eq.${eventId}`)) as any[];
  const codes = new Map(accounts.map((a) => [a.id, a.code]));
  const payables = accounts.filter((a) => a.kind === 'vendor_payable').map((a) => a.id);
  const balances = await creditBalances(db, [escrowId, ...payables]);

  const journals = must(await db.from('club_journal').select('id, kind, memo, created_at').eq('event_id', eventId).order('created_at', { ascending: true })) as any[];
  const lines = journals.length
    ? (must(await db.from('escrow_ledger').select('journal_id, account_id, debit, credit').in('journal_id', journals.map((j) => j.id))) as any[])
    : [];
  const allCodes = await accountCodes(db, lines.map((l) => l.account_id), codes);

  let collected = 0, fees = 0, paidOut = 0;
  for (const l of lines) {
    const code = allCodes.get(l.account_id) || '';
    if (code === 'platform_cash') { collected += Number(l.debit); paidOut += Number(l.credit); }
    if (code === 'club_revenue') fees += Number(l.credit);
  }
  const pending = must(await db.from('club_payouts').select('amount').eq('event_id', eventId).in('status', ['pending_approval', 'approved'])) as any[];
  const held = balances.get(escrowId) ?? 0;
  const owed = payables.reduce((sum, id) => sum + (balances.get(id) ?? 0), 0);

  return {
    eventId, collected, fees, paidOut, heldInEscrow: held, owedToVendors: owed,
    pendingPayouts: pending.reduce((s, p) => s + Number(p.amount), 0),
    reconciled: held === 0 && owed === 0,
    journals: journals.map((j) => ({
      ...j,
      lines: lines.filter((l) => l.journal_id === j.id).map((l) => ({ account: allCodes.get(l.account_id) || l.account_id, debit: Number(l.debit), credit: Number(l.credit) })),
    })),
  };
}

async function accountCodes(db: any, ids: string[], known: Map<string, string>) {
  const missing = Array.from(new Set(ids.filter((id) => !known.has(id))));
  if (missing.length) {
    const rows = must(await db.from('club_ledger_accounts').select('id, code').in('id', missing)) as any[];
    rows.forEach((r) => known.set(r.id, r.code));
  }
  return known;
}
