import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary, handleApiError } from '@/lib/middleware/error-handler';
import { parseVendor } from '@/lib/services/inventory/purchase-input';

const missing = (e: any) => e?.code === '42P01' || e?.code === 'PGRST205';
const NEEDS_MIGRATION = { error: 'Vendors need the latest database update (migration 20261010000008).' };

/** Adds a vendor, or updates the number of the vendor with that name. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const parsed = parseVendor(await request.json().catch(() => ({})));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const v = parsed.value;

    const { data: existing, error: findErr } = await auth.supabase.from('inventory_vendors')
      .select('id').eq('business_id', auth.businessId).ilike('name', v.name.replace(/[\\%_*]/g, (c) => `\\${c}`)).maybeSingle();
    if (missing(findErr)) return NextResponse.json(NEEDS_MIGRATION, { status: 503 });
    if (findErr) throw findErr;

    const write = existing
      ? auth.supabase.from('inventory_vendors').update({ phone: v.phone, notes: v.notes, updated_at: new Date().toISOString() })
        .eq('id', existing.id).eq('business_id', auth.businessId)
      : auth.supabase.from('inventory_vendors').insert({ ...v, business_id: auth.businessId });
    const { data, error } = await write.select('id, name, phone, notes').single();
    if (error) throw error;
    return NextResponse.json({ vendor: data, updated: Boolean(existing) });
  } catch (error) {
    return handleApiError(error, request, 'HostInventoryVendorsPOST');
  }
}, 'HostInventoryVendorsPOST');
