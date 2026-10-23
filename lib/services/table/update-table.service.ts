import { settleAndVacateSession } from '../session/settle-session.service';
import { adminDb } from '@/lib/supabase/admin';
import { resolveTargetTable } from './resolve-table.util';
import { invalidateTablesCache } from './get-tables.service';
import { renameZone, resolveZone, zoneColumnAvailable } from './table-zone.service';

export async function updateHostTable(body: any, user: any, supabase: any, authorizedBizId?: string) {
  // The venue comes from the sign-in (or the signed-in owner's venue), never from the request body.
  let businessId: string | null = authorizedBizId || null;

  if (!businessId && user) {
    const { data: business } = await supabase
      .from('businesses')
      .select('id')
      .eq('host_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (business) businessId = business.id;
  }
  if (!businessId) {
    throw new Error('Business ID is required to update a table');
  }

  // Renaming an area renames it for every table in it (no single table is named).
  if (body.rename_zone) return renameZone(supabase, businessId, body.rename_zone.from, body.rename_zone.to);

  const { id, table_number, status, is_active, seating_capacity } = body;
  if (!id && !table_number) throw new Error('Table id or table_number is required');

  const updatePayload: Record<string, any> = {};
  let normalizedStatus: string | undefined = undefined;

  if (status !== undefined) {
    normalizedStatus = String(status).toUpperCase();
    if (!['VACANT', 'OCCUPIED', 'RESERVED', 'CLEANING'].includes(normalizedStatus)) {
      normalizedStatus = 'VACANT';
    }
    updatePayload.status = normalizedStatus;
  }
  if (is_active !== undefined) updatePayload.is_active = Boolean(is_active);
  if (seating_capacity !== undefined) updatePayload.seating_capacity = Number(seating_capacity) || 4;
  // A table's area: a name sets it, an empty one clears it. Left out, and reported, until the database has the column.
  let zoneSaved = true;
  if ('zone' in body) {
    zoneSaved = await zoneColumnAvailable(supabase);
    if (zoneSaved) updatePayload.zone = await resolveZone(supabase, businessId, body.zone);
  }

  // Nothing to change (an area was asked for before the database can hold one): say so instead of sending an empty update.
  if (Object.keys(updatePayload).length === 0) return { success: true, table: null, zone_saved: zoneSaved };

  const { targetId, targetNum, resolvedBiz } = await resolveTargetTable(supabase, businessId, id, table_number);
  const resolvedBizId: string = resolvedBiz || businessId;

  let updatedTable: any = null;

  // 1. Try updating by verified targetId
  if (targetId) {
    const { data, error } = await supabase
      .from('restaurant_tables')
      .update(updatePayload)
      .eq('id', targetId)
      .eq('business_id', resolvedBizId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[updateHostTable Error Updating by ID]', error);
      throw new Error(`Failed to update table in database: ${error.message}`);
    }
    if (data) updatedTable = data;
  }

  // 2. Fallback: update by businessId and table_number if ID update didn't match
  if (!updatedTable && targetNum) {
    const cleanNum = targetNum.replace(/^(table|t-)\s*/i, '').trim();
    const orFilter = `table_number.eq.${targetNum},table_number.eq.Table ${targetNum},table_number.eq.T-${cleanNum},table_number.eq.${cleanNum}`;
    const { data, error } = await supabase
      .from('restaurant_tables')
      .update(updatePayload)
      .eq('business_id', resolvedBizId)
      .or(orFilter)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[updateHostTable Error Updating by Number]', error);
      throw new Error(`Failed to update table by number in database: ${error.message}`);
    }
    if (data) updatedTable = data;
  }

  // 3. Fallback: if table doesn't exist yet, insert / upsert it
  if (!updatedTable && targetNum) {
    const cleanNum = targetNum.replace(/^(table|t-)\s*/i, '').trim();
    const formattedNum = `T-${cleanNum.padStart(2, '0')}`;
    const slug = `${resolvedBizId.slice(0, 8)}-${formattedNum.toLowerCase()}`;
    const { data, error } = await supabase
      .from('restaurant_tables')
      .insert({
        business_id: resolvedBizId,
        table_number: formattedNum,
        seating_capacity: seating_capacity || 4,
        status: normalizedStatus || 'VACANT',
        is_active: is_active !== undefined ? Boolean(is_active) : true,
        qr_code_slug: slug,
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('[updateHostTable Error Inserting Table]', error);
      throw new Error(`Failed to create/upsert table in database: ${error.message}`);
    }
    if (data) updatedTable = data;
  }

  if (!updatedTable) {
    throw new Error(`Could not find or update table ${table_number || id} for venue ${resolvedBizId}`);
  }

  // 4. Also mirror changes to dedicated public.tables if it exists
  try {
    const tableNum = updatedTable.table_number || targetNum;
    await supabase.from('tables').upsert({
      venue_id: resolvedBizId,
      table_number: tableNum,
      capacity: updatedTable.seating_capacity || 4,
      status: (updatedTable.status || 'vacant').toLowerCase(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'venue_id,table_number' });
  } catch (syncErr) {
    console.warn('[updateHostTable public.tables sync note]', syncErr);
  }

  // 5. Invalidate cache to guarantee fresh state on immediate re-fetch
  invalidateTablesCache(resolvedBizId);

  // 6. Clear sessions if marked VACANT
  if (normalizedStatus === 'VACANT') {
    await settleAndVacateSession({ table_id: updatedTable.id, table_number: updatedTable.table_number, business_id: resolvedBizId }, adminDb());
  }

  return {
    success: true,
    table: updatedTable,
    zone_saved: zoneSaved,
  };
}
