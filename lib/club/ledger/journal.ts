// Double-entry posting. Every money movement is one balanced journal, posted atomically by the
// database function club_post_journal (idempotent by key; refuses to overdraw escrow or payables).
// The checks here run first so a bad journal never reaches the database.
import { ClubError, fail, must } from '../http';

export type AccountKind = 'platform_cash' | 'event_escrow' | 'vendor_payable' | 'club_revenue';
export interface Line { account_id: string; debit?: number; credit?: number }
export interface Journal { key: string; kind: string; eventId: string | null; memo?: string | null; actorId?: string | null; lines: Line[] }

export function balanceError(lines: Line[]): string | null {
  if (lines.length < 2) return 'A journal needs at least two lines.';
  let dr = 0, cr = 0;
  for (const l of lines) {
    const d = l.debit ?? 0, c = l.credit ?? 0;
    if (!Number.isSafeInteger(d) || !Number.isSafeInteger(c) || d < 0 || c < 0) return 'Amounts must be whole paise.';
    if ((d > 0) === (c > 0)) return 'Each line is either a debit or a credit.';
    dr += d; cr += c;
  }
  return dr === cr && dr > 0 ? null : `Debits (${dr}) and credits (${cr}) must match.`;
}

export async function postJournal(db: any, j: Journal): Promise<string> {
  const problem = balanceError(j.lines);
  if (problem) throw new ClubError(500, `Ledger refused: ${problem}`);
  const { data, error } = await db.rpc('club_post_journal', {
    p_key: j.key, p_kind: j.kind, p_event: j.eventId, p_memo: j.memo ?? null, p_actor: j.actorId ?? null,
    p_lines: j.lines.map((l) => ({ account_id: l.account_id, debit: l.debit ?? 0, credit: l.credit ?? 0 })),
  });
  if (error) {
    if (/Insufficient funds/i.test(error.message || '')) fail(409, 'There is not enough money in this plan\'s escrow for that.', 'insufficient_funds');
    throw error;
  }
  return data as string;
}

export interface AccountRef { code: string; kind: AccountKind; event_id?: string | null; property_id?: string | null }

export const CASH: AccountRef = { code: 'platform_cash', kind: 'platform_cash' };
export const REVENUE: AccountRef = { code: 'club_revenue', kind: 'club_revenue' };
export const escrowOf = (eventId: string): AccountRef => ({ code: `escrow:${eventId}`, kind: 'event_escrow', event_id: eventId });
export const payableOf = (eventId: string, payeeKey: string, propertyId: string | null = null): AccountRef =>
  ({ code: `payable:${eventId}:${payeeKey}`, kind: 'vendor_payable', event_id: eventId, property_id: propertyId });

/** The account's id, creating it on first use. */
export async function ensureAccount(db: any, ref: AccountRef): Promise<string> {
  const found = must(await db.from('club_ledger_accounts').select('id').eq('code', ref.code).maybeSingle()) as { id: string } | null;
  if (found) return found.id;
  const res = await db.from('club_ledger_accounts').insert({ code: ref.code, kind: ref.kind, event_id: ref.event_id ?? null, property_id: ref.property_id ?? null })
    .select('id').single();
  if (res.error?.code === '23505') return (must(await db.from('club_ledger_accounts').select('id').eq('code', ref.code).single()) as { id: string }).id;
  return (must(res) as { id: string }).id;
}

/** Balance per account: credits minus debits (positive for money held in escrow or owed to vendors). */
export async function creditBalances(db: any, accountIds: string[]): Promise<Map<string, number>> {
  const out = new Map(accountIds.map((id) => [id, 0]));
  if (accountIds.length === 0) return out;
  const lines = must(await db.from('escrow_ledger').select('account_id, debit, credit').in('account_id', accountIds)) as any[];
  for (const l of lines) out.set(l.account_id, (out.get(l.account_id) ?? 0) + Number(l.credit) - Number(l.debit));
  return out;
}
