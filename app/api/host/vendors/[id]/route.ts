import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { parseVendorInput } from '@/lib/services/vendors/vendor-input';
import { deleteVendor, updateVendor } from '@/lib/services/vendors/vendors.service';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/host/vendors/:id: edit any of name, category, whatsapp_phone, qr_image (null removes it), notes. */
export const PATCH = withApiErrorBoundary(async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireHost(request);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 });
  let patch;
  try {
    patch = parseVendorInput(await request.json().catch(() => ({})), true);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
  const vendor = await updateVendor(adminDb(), auth.business.id, id, patch);
  if (!vendor) return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 });
  return NextResponse.json({ success: true, vendor });
}, 'HostVendorPATCH');

/** DELETE /api/host/vendors/:id: remove the host's own vendor. */
export const DELETE = withApiErrorBoundary(async function DELETE(request: Request, ctx: Ctx) {
  const auth = await requireHost(request);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  if (!UUID.test(id) || !(await deleteVendor(adminDb(), auth.business.id, id))) {
    return NextResponse.json({ error: 'Vendor not found.' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}, 'HostVendorDELETE');
