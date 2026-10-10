import type { VenueTopupRequest, TopupRequestStatus } from '@/types/wallet';
import { memTopupRequests } from './wallet-memory.store';

export async function getVenuePendingTopup(
  supabase: any,
  venueId: string
): Promise<VenueTopupRequest | null> {
  try {
    const { data, error } = await supabase
      .from('venue_topup_requests')
      .select('*')
      .eq('venue_id', venueId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    // The table answered: trust it. The memory copy below is only for when it can't be read, since
    // a request reviewed on another server instance would otherwise stay "pending" here forever.
    if (!error && !data) return null;
    if (data) {
      return {
        ...(data as VenueTopupRequest),
        request_type: data.request_type || (data.requested_plan_tier && data.requested_plan_tier !== 'pay_as_you_go' ? 'plan_subscription' : 'wallet_topup'),
        venue_name: (data as any).venue_name || 'Venue',
        venue_address: (data as any).venue_address || 'Venue Location',
      };
    }
  } catch {}

  const memReq = memTopupRequests.find(
    (r) => r.venue_id === venueId && r.status === 'pending'
  );
  if (memReq) {
    return {
      ...memReq,
      request_type: memReq.request_type || (memReq.requested_plan_tier && memReq.requested_plan_tier !== 'pay_as_you_go' ? 'plan_subscription' : 'wallet_topup'),
      venue_name: memReq.venue_name || 'Venue',
      venue_address: memReq.venue_address || 'Venue Location',
    };
  }
  return null;
}

export async function getAllTopupRequests(
  supabase: any,
  statusFilter?: TopupRequestStatus | 'all'
): Promise<VenueTopupRequest[]> {
  let results: VenueTopupRequest[] = [];
  try {
    let query = supabase
      .from('venue_topup_requests')
      .select('*, businesses(business_name, name)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[getAllTopupRequests] Supabase query error:', error);
      // Fallback query with simple select('*')
      const fallback = await supabase
        .from('venue_topup_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (fallback.data && fallback.data.length > 0) {
        results = fallback.data.map((item: any) => ({
          ...item,
          request_type: item.request_type || (item.requested_plan_tier && item.requested_plan_tier !== 'pay_as_you_go' ? 'plan_subscription' : 'wallet_topup'),
          venue_name: item.venue_name || 'Venue',
          venue_address: item.venue_address || 'Venue Location',
        }));
        if (statusFilter && statusFilter !== 'all') {
          return results.filter((r) => r.status === statusFilter);
        }
        return results;
      }
    } else if (data && data.length > 0) {
      results = data.map((item: any) => {
        const bizName = item.businesses?.business_name || item.businesses?.name || item.venue_name || 'Venue';
        return {
          ...item,
          request_type: item.request_type || (item.requested_plan_tier && item.requested_plan_tier !== 'pay_as_you_go' ? 'plan_subscription' : 'wallet_topup'),
          venue_name: bizName,
          venue_address: item.venue_address || 'Venue Location',
        };
      });
      return results;
    }
  } catch (err) {
    console.error('[getAllTopupRequests] Exception:', err);
  }

  const source =
    statusFilter && statusFilter !== 'all'
      ? memTopupRequests.filter((r) => r.status === statusFilter)
      : [...memTopupRequests];

  return source.map((r) => ({
    ...r,
    request_type: r.request_type || (r.requested_plan_tier && r.requested_plan_tier !== 'pay_as_you_go' ? 'plan_subscription' : 'wallet_topup'),
    venue_name: r.venue_name || 'Venue',
    venue_address: r.venue_address || 'Venue Location',
  }));
}
