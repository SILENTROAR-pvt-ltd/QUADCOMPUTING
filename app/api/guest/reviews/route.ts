import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/supabase/admin';
import { validateGuestAccess } from '@/lib/auth/guest-validate';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { enforceRateLimit } from '@/lib/middleware/rate-limiter';
import { accountForRequest } from '@/lib/services/guest-auth/guest-account.service';
import { listVenueReviews } from '@/lib/services/reviews/review-view';
import { cleanReviewInput, insertVenueReview } from '@/lib/services/reviews/review-write';

// venue_reviews is the only source. A per-instance memory copy once showed one venue's
// reviews at other venues on the same serverless instance.

export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cafeId = searchParams.get('cafe_id') || searchParams.get('business_id');

    const validation = await validateGuestAccess(cafeId);
    if (validation.error) return validation.error;

    // No reviews yet is a real answer for a new venue.
    const reviews = await listVenueReviews(adminDb(), validation.businessId);
    return NextResponse.json({ success: true, reviews });
  } catch (error: any) {
    console.error('[API Reviews GET Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}, 'GuestReviewsGET');

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const rawCafeId = searchParams.get('cafe_id') || searchParams.get('business_id') || body.business_id || body.cafe_id;
    const rawTable = body.table || body.table_number || 'T-01';

    const validation = await validateGuestAccess(rawCafeId, rawTable);
    if (validation.error) return validation.error;
    const { businessId, tableNumber } = validation;

    const limited = await enforceRateLimit(request, 'guest_review', 30, 60_000, businessId);
    if (limited) return limited;

    const input = cleanReviewInput(body);
    // A signed-in guest's review carries their account name, so the card can show their photo.
    const signedIn = await accountForRequest(adminDb(), request, businessId);
    const author = signedIn?.display_name ?? input.author;

    const table = tableNumber || 'T-01';
    const id = await insertVenueReview(adminDb(), businessId, table, { ...input, author }, signedIn?.id ?? null);
    const review = {
      id,
      author,
      table,
      rating: input.rating,
      comment: input.comment,
      tags: input.tags,
      images: input.images,
      verified: false,
      helpfulCount: 0,
      timestamp: 'Just now',
    };
    return NextResponse.json({ success: true, review });
  } catch (error: any) {
    console.error('[API Reviews POST Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}, 'GuestReviewsPOST');
