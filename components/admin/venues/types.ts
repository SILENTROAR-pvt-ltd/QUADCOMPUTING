export interface VenueRow {
  id: string; name: string; slug: string | null; categories: string[]; createdAt: string;
  city: string | null; state: string | null; owner: string | null; email: string | null; phone: string | null; legalName: string | null;
  plan: { tier: string; status: string; name: string; phase: string; onTrial: boolean; endsAt: string | null; daysLeft: number | null; vibeyUntil: string | null; trialUsed: boolean; setupPaid: boolean };
  wallet: number; dues: number;
  last30: { gmv: number; orders: number; stay: number; lastDay: string | null };
  compliance: { gstin: string | null; gstValid: boolean; gstConfirmed: boolean; fssai: string | null; fssaiValid: boolean; pan: boolean; rooms: number; foreignStays: number };
  review: { status: string; note: string | null; reviewed_at: string | null } | null;
}

export const REVIEW_LOOK: Record<string, { label: string; cls: string }> = {
  approved: { label: 'Approved', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  pending: { label: 'To review', cls: 'border-amber-200 bg-amber-50 text-amber-800' },
  needs_docs: { label: 'Needs documents', cls: 'border-amber-200 bg-amber-50 text-amber-800' },
  rejected: { label: 'Rejected', cls: 'border-rose-200 bg-rose-50 text-rose-700' },
};

/** The plan's state in a few words, for the table. */
export function phaseText(p: VenueRow['plan']): string {
  if (p.status === 'suspended') return 'Suspended';
  if (p.onTrial) return `Free month · ${p.daysLeft} d left`;
  if (p.phase === 'grace') return `Grace · ${p.daysLeft} d left`;
  if (p.phase === 'expiring') return `Ends in ${p.daysLeft} d`;
  if (p.phase === 'active') return `Until ${p.endsAt ? new Date(p.endsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}`;
  if (p.phase === 'expired') return 'Plan ended · ₹3 a bill';
  return '₹3 a bill';
}
