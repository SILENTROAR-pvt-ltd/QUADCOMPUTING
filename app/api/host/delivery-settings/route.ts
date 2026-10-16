import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { loadDeliverySettings, saveDeliverySettings } from '@/lib/services/delivery/delivery-settings.service';
import { parseDeliverySettingsInput } from '@/lib/services/delivery/delivery-input';

export const dynamic = 'force-dynamic';

const noStore = { 'Cache-Control': 'no-store' };

/** GET /api/host/delivery-settings: the venue's delivery radius, minimum order, fee and location. */
export const GET = withApiErrorBoundary(async function GET(request: Request) {
  const auth = await requireHost(request);
  if (auth.error) return auth.error;
  const settings = await loadDeliverySettings(adminDb(), auth.business.id);
  return NextResponse.json({
    success: true,
    settings: {
      enabled: settings.enabled,
      radiusKm: settings.radiusKm,
      minOrder: settings.minOrder,
      fee: settings.fee,
      venueLat: settings.venue?.lat ?? null,
      venueLng: settings.venue?.lng ?? null,
    },
  }, { headers: noStore });
}, 'HostDeliverySettingsGET');

/** PUT /api/host/delivery-settings: the owner saves the delivery terms. Staff PINs cannot change them. */
export const PUT = withApiErrorBoundary(async function PUT(request: Request) {
  const auth = await requireHost(request);
  if (auth.error) return auth.error;
  if (auth.staff) return NextResponse.json({ error: 'Only the owner can change delivery settings.' }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  let input;
  try {
    input = parseDeliverySettingsInput(body);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  try {
    await saveDeliverySettings(adminDb(), auth.business.id, input);
  } catch {
    return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}, 'HostDeliverySettingsPUT');
