import { safeMessage } from '@/lib/utils/safe-message';
import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { withOfferImage } from '@/lib/services/offers/offer-columns';
import { readOfferImage } from '@/lib/services/offers/offer-photo';
import { hasFeature, requireFeature } from '@/lib/services/billing/feature-gate';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OFFER_CATEGORIES = ['room', 'food', 'general'];
const STORAGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const BAD_PHOTO = 'Add the photo through the offer form (upload it or paste its link) so it is kept on your own storage.';

// venue_live_offers is the only source of truth. A per-instance in-memory fallback
// made offers appear saved to the host while other instances (and guests) never saw them.

export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const venueId =
      searchParams.get('venue_id') ||
      searchParams.get('cafe_id') ||
      searchParams.get('business_id');

    if (!venueId || !UUID_REGEX.test(venueId)) {
      return NextResponse.json({ error: 'Valid venue_id UUID is required' }, { status: 400 });
    }
    const category = searchParams.get('category');

    // Guests only ever see live offers. Paused offers go to the venue's own host, so the host can switch them back on.
    const activeOnly = searchParams.get('active_only') !== 'false';
    if (!activeOnly) {
      const auth = await requireHost(request);
      if (auth.error) return auth.error;
      if (auth.businessId !== venueId) {
        return NextResponse.json({ error: 'Offer list not found for this venue' }, { status: 403 });
      }
    }
    // Offers are part of M²-Pro and Rhodium: on M¹-Pro guests see none (the host still sees its own, to pause or delete).
    if (activeOnly && !(await hasFeature(venueId, 'offers'))) {
      return NextResponse.json({ success: true, source: 'supabase', offers: [] });
    }

    const { data, error } = await withOfferImage((columns) => {
      let query = adminDb()
        .from('venue_live_offers')
        .select(columns)
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false });
      if (activeOnly) query = query.eq('is_active', true);
      if (category && category !== 'all') query = query.eq('category', category);
      return query;
    });
    if (error) throw error;

    return NextResponse.json({ success: true, source: 'supabase', offers: data || [] });
  } catch (error: any) {
    console.error('[API Offers GET Error]:', error);
    return NextResponse.json({ error: safeMessage(error, 'Failed to fetch offers') }, { status: 500 });
  }
}, 'VenueOffersGET');

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId } = auth;
    const blocked = await requireFeature(businessId, 'offers');
    if (blocked) return blocked;

    const body = await request.json().catch(() => ({}));
    const { title, description, category, discount_badge, valid_until, is_active } = body;

    const resolvedTitle = String(title || '').trim().slice(0, 120);
    const resolvedBadge = String(discount_badge || '').trim().slice(0, 40);
    const resolvedCategory = String(category || 'general').toLowerCase();
    const image = readOfferImage(body.image_url, businessId, STORAGE_BASE);

    if (!resolvedTitle) {
      return NextResponse.json({ error: 'Offer title is required' }, { status: 400 });
    }
    if (!resolvedBadge) {
      return NextResponse.json({ error: 'Discount badge is required' }, { status: 400 });
    }
    if (image.invalid) return NextResponse.json({ error: BAD_PHOTO }, { status: 400 });

    const row: Record<string, unknown> = {
      venue_id: businessId,
      title: resolvedTitle,
      description: String(description || '').trim().slice(0, 400) || null,
      category: OFFER_CATEGORIES.includes(resolvedCategory) ? resolvedCategory : 'general',
      discount_badge: resolvedBadge,
      valid_until: valid_until || null,
      is_active: is_active !== false,
    };
    const { data, error } = await withOfferImage((columns, hasImage) => adminDb()
      .from('venue_live_offers')
      .insert(hasImage && image.value ? { ...row, image_url: image.value } : row)
      .select(columns)
      .single());

    if (error) throw error;

    return NextResponse.json({ success: true, source: 'supabase', offer: data });
  } catch (error: any) {
    console.error('[API Offers POST Error]:', error);
    return NextResponse.json({ error: safeMessage(error, 'Failed to create offer') }, { status: 500 });
  }
}, 'VenueOffersPOST');

export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId } = auth;

    const body = await request.json().catch(() => ({}));
    const { id, is_active, title, description, category, discount_badge, valid_until } = body;

    if (!id) {
      return NextResponse.json({ error: 'Offer id is required' }, { status: 400 });
    }
    // Without offers on the plan an offer can still be paused (or deleted), never edited or switched back on.
    if (is_active !== false) {
      const blocked = await requireFeature(businessId, 'offers');
      if (blocked) return blocked;
    }

    const updates: Record<string, unknown> = {};
    if (typeof is_active === 'boolean') updates.is_active = is_active;
    if (title) updates.title = title.trim();
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (category && OFFER_CATEGORIES.includes(String(category).toLowerCase())) updates.category = String(category).toLowerCase();
    if (discount_badge) updates.discount_badge = discount_badge.trim();
    if (valid_until !== undefined) updates.valid_until = valid_until;
    updates.updated_at = new Date().toISOString();
    const image = readOfferImage(body.image_url, businessId, STORAGE_BASE);
    if (image.invalid) return NextResponse.json({ error: BAD_PHOTO }, { status: 400 });

    const { data, error } = await withOfferImage((columns, hasImage) => adminDb()
      .from('venue_live_offers')
      .update(hasImage && image.value !== undefined ? { ...updates, image_url: image.value } : updates)
      .eq('id', id)
      .eq('venue_id', businessId)
      .select(columns)
      .maybeSingle());

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Offer not found for this venue' }, { status: 404 });
    }

    return NextResponse.json({ success: true, source: 'supabase', offer: data });
  } catch (error: any) {
    console.error('[API Offers PATCH Error]:', error);
    return NextResponse.json({ error: safeMessage(error, 'Failed to update offer') }, { status: 500 });
  }
}, 'VenueOffersPATCH');

export const DELETE = withApiErrorBoundary(async function DELETE(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId } = auth;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Offer id is required' }, { status: 400 });
    }

    const { error } = await adminDb()
      .from('venue_live_offers')
      .delete()
      .eq('id', id)
      .eq('venue_id', businessId);

    if (error) throw error;

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error('[API Offers DELETE Error]:', error);
    return NextResponse.json({ error: safeMessage(error, 'Failed to delete offer') }, { status: 500 });
  }
}, 'VenueOffersDELETE');
