import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { parseVendorInput, type VendorInput } from '@/lib/services/vendors/vendor-input';
import { createVendor, listVendors } from '@/lib/services/vendors/vendors.service';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

/** GET /api/host/vendors: the venue's vendors (partners, bike rental, taxi...), newest first. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const auth = await requireHost(request);
  if (auth.error) return auth.error;
  const vendors = await listVendors(adminDb(), auth.business.id);
  return NextResponse.json({ success: true, vendors }, { headers: noStore });
}, 'HostVendorsGET');

/** POST /api/host/vendors: add a vendor. Body: name, category, whatsapp_phone, qr_image (data URL, optional), notes. */
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  const auth = await requireHost(request);
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => ({}));
  let input: VendorInput;
  try {
    input = parseVendorInput(body) as VendorInput;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  const vendor = await createVendor(adminDb(), auth.business.id, input);
  return NextResponse.json({ success: true, vendor }, { status: 201 });
}, 'HostVendorsPOST');
