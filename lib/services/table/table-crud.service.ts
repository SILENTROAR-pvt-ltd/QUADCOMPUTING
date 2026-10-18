import { invalidateTablesCache } from './get-tables.service';
import { resolveZone, zoneColumnAvailable } from './table-zone.service';
import { cleanZone } from './table-zones';

export async function createHostTable(body: any, user: any, supabase: any, authorizedBizId?: string) {
  let businessId = authorizedBizId || body.business_id || body.venue_id;
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
    throw new Error('Business ID is required to create a table');
  }

  const { table_number, seating_capacity, location_id } = body;
  if (!table_number) throw new Error('table_number is required');

  const cleanNum = table_number.replace(/^(table|t-)\s*/i, '').trim();
  const formattedNum = `T-${cleanNum.padStart(2, '0')}`;
  const slug = `${businessId.slice(0, 8)}-${formattedNum.toLowerCase().replace(/\s+/g, '-')}`;

  // An optional area ("Ground floor"). Left out, and reported, until the database has the column.
  const wantsZone = Boolean(cleanZone(body.zone));
  const zoneSaved = !wantsZone || (await zoneColumnAvailable(supabase));
  const zone = wantsZone && zoneSaved ? await resolveZone(supabase, businessId, body.zone) : null;

  const { data: table, error: insertError } = await supabase
    .from('restaurant_tables')
    .insert({
      business_id: businessId,
      location_id: location_id || null,
      table_number: formattedNum,
      seating_capacity: seating_capacity || 4,
      status: 'VACANT',
      is_active: true,
      qr_code_slug: slug,
      ...(zone ? { zone } : {}),
    })
    .select()
    .single();

  if (insertError) {
    console.error('[createHostTable error]', insertError);
    throw insertError;
  }

  try {
    await supabase.from('tables').upsert({
      venue_id: businessId,
      table_number: formattedNum,
      capacity: seating_capacity || 4,
      status: 'vacant',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'venue_id,table_number' });
  } catch (syncErr) {
    console.warn('[createHostTable tables sync note]', syncErr);
  }

  invalidateTablesCache(businessId);
  return { table, zone_saved: zoneSaved };
}

export async function deleteHostTable(body: any, user: any, supabase: any, authorizedBizId?: string) {
  let businessId = authorizedBizId || body.business_id || body.venue_id;
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

  const { id } = body;
  if (!id) throw new Error('Table id is required for deactivation');

  let q = supabase.from('restaurant_tables').update({ is_active: false }).eq('id', id);
  if (businessId) q = q.eq('business_id', businessId);

  const { error } = await q;
  if (error) {
    console.error('[deleteHostTable error]', error);
    throw error;
  }

  if (businessId) invalidateTablesCache(businessId);
  return { success: true };
}
