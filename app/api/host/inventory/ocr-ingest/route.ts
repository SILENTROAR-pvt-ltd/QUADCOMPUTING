import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';

// Bill OCR is not implemented. This route used to ignore the request entirely and add a fixed
// list of fake purchases (coffee beans, milk, sugar, napkins) to the venue's real stock and
// inventory log on every call. It now refuses honestly until real extraction exists.
export const POST = withApiErrorBoundary(async function POST(request: Request) {
  const auth = await requireHost(request);
  if (auth.error) return auth.error;

  return NextResponse.json(
    { success: false, error: "Bill scanning isn't available yet. Please add stock manually.", code: 'NOT_IMPLEMENTED' },
    { status: 501 }
  );
}, 'HostInventoryOcrIngestPOST');
