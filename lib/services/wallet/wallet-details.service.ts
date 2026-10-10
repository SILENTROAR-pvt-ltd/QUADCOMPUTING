import type { UsageLedgerItem } from '@/types/wallet';
import { mem } from './wallet-memory.store';
import { getOrProvisionVenueWallet } from './wallet-provision.service';
import { getVenuePendingTopup } from './topup-request-queries.service';

export async function getVenueWalletDetails(supabase: any, venueId: string) {
  const base = await getOrProvisionVenueWallet(supabase, venueId);
  if (!base) throw new Error('Venue not found');
  let ledger: UsageLedgerItem[] = [];

  try {
    const { data } = await supabase
      .from('usage_ledger')
      .select('*')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) ledger = data;
  } catch {
    ledger = mem.get(venueId)?.ledger || [];
  }

  const pendingRequest = await getVenuePendingTopup(supabase, venueId);

  return {
    subscription: base.subscription,
    wallet: base.wallet,
    ledger,
    pendingRequest,
    hasPendingApproval: Boolean(pendingRequest),
  };
}
