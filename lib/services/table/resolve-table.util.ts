export async function resolveTargetTable(
  supabase: any,
  businessId?: string | null,
  id?: string,
  table_number?: string
) {
  let targetId = id;
  let targetNum = table_number;
  let resolvedBiz = businessId;

  // 1. If targetId provided, check if it actually exists in DB (inside the venue when one is known:
  // a table id from another venue is treated as unknown, so nothing outside this venue is changed)
  if (targetId) {
    let byId = supabase.from('restaurant_tables').select('id, table_number, business_id').eq('id', targetId);
    if (resolvedBiz) byId = byId.eq('business_id', resolvedBiz);
    const { data: t } = await byId.maybeSingle();

    if (t) {
      targetNum = t.table_number;
      if (!resolvedBiz) resolvedBiz = t.business_id;
    } else {
      // ID was not found in DB (e.g., synthetic client ID). Clear it so we fallback to table_number
      targetId = undefined;
    }
  }

  // 2. If targetId not yet verified and targetNum is available, find by table_number
  if (!targetId && targetNum) {
    const cleanNum = targetNum.replace(/^(table|t-)\s*/i, '').trim();
    let q = supabase.from('restaurant_tables').select('id, table_number, business_id');
    if (resolvedBiz) q = q.eq('business_id', resolvedBiz);

    const orFilter = `table_number.eq.${targetNum},table_number.eq.Table ${targetNum},table_number.eq.T-${cleanNum},table_number.eq.${cleanNum}`;
    const { data: t } = await q.or(orFilter).limit(1).maybeSingle();

    if (t) {
      targetId = t.id;
      targetNum = t.table_number;
      if (!resolvedBiz) resolvedBiz = t.business_id;
    }
  }

  return { targetId, targetNum, resolvedBiz };
}

