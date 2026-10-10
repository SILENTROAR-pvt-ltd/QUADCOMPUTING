import { NextResponse } from 'next/server';
import { requireHost, adminDb } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// NOTE: this route used to keep a module-level `inMemoryVault` seeded from
// hardcoded demo photos with `venue_id: ''`, and the GET fallback matched any
// row where `!p.venue_id` — i.e. every venue saw the same demo content, and
// anything a host added leaked to other venues on the same serverless
// instance. The table is the only source of truth now.

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

    const supabase = adminDb();
    // Dish photos are menu material, not event moments: they are never listed here.
    let query = supabase
      .from('venue_photo_vault')
      .select('id, venue_id, title, category, time_tag, image_url, description, is_active, created_at')
      .eq('venue_id', venueId)
      .eq('is_active', true)
      .neq('category', 'Dish photos')
      .order('created_at', { ascending: false });

    if (category && category !== 'All') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;

    const mapped = (data || []).map((row: any) => ({
      id: row.id,
      venue_id: row.venue_id,
      title: row.title,
      category: row.category,
      time_tag: row.time_tag || '',
      timeTag: row.time_tag || '',
      date: row.time_tag ? row.time_tag.split('@')[0]?.trim() : 'Live Event',
      time: row.time_tag ? row.time_tag.split('@')[1]?.trim() || '' : '',
      imageUrl: row.image_url,
      image_url: row.image_url,
      description: row.description || '',
      created_at: row.created_at,
    }));

    // An empty vault is a legitimate state for a new venue — return it as such
    // rather than substituting another venue's content.
    return NextResponse.json({ success: true, source: 'supabase', photos: mapped });
  } catch (error: any) {
    console.error('[API Photo-Vault GET Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch photos' }, { status: 500 });
  }
}, 'VenuePhotoVaultGET');

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId } = auth;

    const body = await request.json().catch(() => ({}));
    const {
      title,
      category,
      time_tag,
      timeTag,
      image_url,
      imageUrl,
      description,
    } = body;

    const resolvedVenueId = businessId;
    const resolvedTitle = (title || '').trim();
    const resolvedCategory = (category || 'Acoustic Lounge').trim();
    const resolvedTimeTag = (time_tag || timeTag || 'Tonight @ 8:00 PM').trim();
    const resolvedImageUrl = (image_url || imageUrl || '').trim();
    const resolvedDescription = (description || '').trim();

    if (!resolvedTitle) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!resolvedImageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // Insert is the single source of truth: a failure here is a real failure.
    // Previously this wrote to an in-memory array first and still returned
    // success:true when the DB insert failed, so the host saw their photo
    // "saved" while nothing had actually persisted.
    const supabase = adminDb();
    const { data, error } = await supabase
      .from('venue_photo_vault')
      .insert({
        venue_id: resolvedVenueId,
        title: resolvedTitle,
        category: resolvedCategory,
        time_tag: resolvedTimeTag,
        image_url: resolvedImageUrl,
        description: resolvedDescription,
        is_active: true,
      })
      .select('id, venue_id, title, category, time_tag, image_url, description, is_active, created_at')
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      source: 'supabase',
      item: {
        ...data,
        timeTag: data.time_tag || '',
        date: (data.time_tag || '').includes('@') ? data.time_tag.split('@')[0]?.trim() : data.time_tag,
        time: (data.time_tag || '').includes('@') ? data.time_tag.split('@')[1]?.trim() : '',
        imageUrl: data.image_url,
      },
    });
  } catch (error: any) {
    console.error('[API Photo-Vault POST Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'VenuePhotoVaultPOST');

export const PATCH = withApiErrorBoundary(async function PATCH(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId } = auth;

    const body = await request.json().catch(() => ({}));
    const { id, is_active, title, description, category, image_url, time_tag } = body;

    if (!id) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }

    const updates: any = {};
    if (typeof is_active === 'boolean') updates.is_active = is_active;
    if (title) updates.title = title.trim();
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (category) updates.category = category.trim();
    if (image_url) updates.image_url = image_url.trim();
    if (time_tag) updates.time_tag = time_tag.trim();

    const supabase = adminDb();
    const { data, error } = await supabase
      .from('venue_photo_vault')
      .update(updates)
      .eq('id', id)
      .eq('venue_id', businessId)
      .select('id, venue_id, title, category, time_tag, image_url, description, is_active, created_at')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: 'Photo not found for this venue' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, source: 'supabase', item: data });
  } catch (error: any) {
    console.error('[API Photo-Vault PATCH Error]:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}, 'VenuePhotoVaultPATCH');

export const DELETE = withApiErrorBoundary(async function DELETE(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId } = auth;

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      const body = await request.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }

    // Scoped to this venue — a host can only delete their own vault rows.
    const supabase = adminDb();
    const { error } = await supabase
      .from('venue_photo_vault')
      .delete()
      .eq('id', id)
      .eq('venue_id', businessId);

    if (error) throw error;

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error('[API Photo-Vault DELETE Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete' }, { status: 500 });
  }
}, 'VenuePhotoVaultDELETE');
