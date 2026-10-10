import type { UsageLedgerItem } from '@/types/wallet';
import { planById } from '@/lib/services/wallet/plans';

export type LedgerKind = 'credit' | 'plan' | 'debit' | 'free';

const LABELS: Record<string, string> = {
  bill_generate: 'Bill fee',
  room_accommodation: 'Room stay fee',
  room_creation: 'Room added',
  menu_item_creation: 'Menu item added',
  menu_addon: 'Add-on',
  menu_addon_creation: 'Add-on added',
  onboarding_free_tier: 'Welcome credit setup',
  WALLET_TOPUP: 'Credit added',
  CREDIT_TOPUP: 'Credit added',
  PLAN_PURCHASE: 'Plan purchased',
  OUTSTANDING_CLEARED: 'Dues cleared',
};

// Approved top-ups are stored with a positive cost (like fees), so the entry type, not the sign,
// says which way the money moved.
const CREDIT_TYPES = new Set(['WALLET_TOPUP', 'CREDIT_TOPUP']);

const money = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** How one statement line reads: label, direction and signed amount. */
export function describeLedger(item: UsageLedgerItem & { metadata?: any }) {
  const cost = Number(item.cost) || 0;
  const meta = item.metadata && typeof item.metadata === 'object' ? item.metadata : {};
  const reference = item.reference_id ? (item.reference_id.startsWith('TOPUP_') && meta.utr ? `UTR ${meta.utr}` : item.reference_id.slice(0, 18)) : '—';

  if (item.action_type === 'PLAN_PURCHASE') {
    const plan = planById(meta.plan_tier);
    const paid = Number(meta.amount) || 0;
    return { kind: 'plan' as LedgerKind, label: plan ? `${plan.name} plan purchased` : LABELS.PLAN_PURCHASE, reference, amount: paid ? `${money(paid)} paid` : '—' };
  }
  const label = LABELS[item.action_type] || item.action_type.replace(/_/g, ' ');
  if (CREDIT_TYPES.has(item.action_type) || cost < 0) return { kind: 'credit' as LedgerKind, label, reference, amount: `+${money(Math.abs(cost))}` };
  if (cost === 0) return { kind: 'free' as LedgerKind, label, reference, amount: 'Free' };
  return { kind: 'debit' as LedgerKind, label, reference, amount: `−${money(cost)}` };
}
