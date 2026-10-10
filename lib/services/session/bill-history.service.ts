export async function getBillRequestHistory(supabase: any, explicitBusinessId?: string) {
  let businessId: string | null = explicitBusinessId || null;
  if (!businessId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: business } = await supabase.from('businesses').select('id').eq('host_id', user.id).maybeSingle();
      businessId = business?.id || null;
    }
  }
  if (!businessId) {
    throw new Error('Business not found');
  }

  const { data: events } = await supabase.from('bill_request_events').select('*')
    .eq('business_id', businessId).order('requested_at', { ascending: false }).limit(100);

  const sessionIds = Array.from(new Set((events || []).map((e: any) => e.session_id).filter(Boolean)));
  const { data: sessions } = sessionIds.length
    ? await supabase.from('dine_in_sessions').select('id, status').in('id', sessionIds)
    : { data: [] };
  const statusById = new Map((sessions || []).map((s: any) => [s.id, s.status]));

  let inMemRequests: any[] = [];
  try {
    const { getInMemBillRequests } = await import('@/lib/store/active-order-store');
    inMemRequests = getInMemBillRequests(businessId) || [];
  } catch {}

  const dbMapped = (events || []).map((e: any) => {
    const stat = statusById.get(e.session_id);
    return { ...e, session_status: Boolean(e.settled_at || stat === 'closed') ? 'closed' : (stat || 'bill_requested') };
  });

  const seenKeys = new Set(dbMapped.map((r: any) => `${r.table_number}_${r.session_id || ''}`));
  const combined = [...dbMapped];
  for (const imr of inMemRequests) {
    const key = `${imr.table_number}_${imr.session_id || ''}`;
    if (!seenKeys.has(key)) { seenKeys.add(key); combined.push(imr); }
  }

  combined.sort((a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime());
  return { success: true, requests: combined };
}
