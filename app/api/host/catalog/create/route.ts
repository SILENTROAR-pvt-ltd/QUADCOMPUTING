import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import type { CatalogItemId } from '@/types/catalog';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;

    const body = await request.json();
    const {
      branchId,
      name,
      description,
      price,
      imageUrl,
      itemType,
      category,
      inventoryCount,
      capacity,
      bedType,
      amenities,
      dietType,
      prepTimeMinutes,
      duration,
      providerType,
      metadata: extraMetadata
    } = body;

    // branchId is optional: a freshly provisioned host may not have its branches
    // hydrated client-side yet, and the authenticated session already tells us
    // the business. It's resolved (and ownership-checked) below.
    if (!name || price == null || !itemType || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let metadata: Record<string, any> = extraMetadata || {};
    if (itemType === 'room') {
      metadata = {
        ...metadata,
        capacity: capacity || null,
        bed_type: bedType || null,
        amenities: amenities || []
      };
    } else if (itemType === 'food') {
      metadata = {
        ...metadata,
        dietary: dietType || 'veg',
        prep_time_minutes: prepTimeMinutes ? parseInt(prepTimeMinutes, 10) : null,
      };
    } else if (itemType === 'service') {
      metadata = {
        ...metadata,
        duration: duration || null,
        provider_type: providerType || 'in_house',
      };
    }

    // Resolve the location to attach this item to. The authenticated business is
    // the only authority for tenancy; a supplied branchId can only narrow it to
    // one of THIS business's locations, never redirect to another's.
    let resolvedLocationId: string | null = null;

    if (branchId) {
      const { data: location, error: locError } = await supabase
        .from('locations')
        .select('id')
        .eq('id', branchId)
        .eq('business_id', businessId)
        .maybeSingle();

      if (locError) throw locError;
      if (!location) {
        return NextResponse.json(
          { error: 'Invalid branch ID or ownership not confirmed.' },
          { status: 400 }
        );
      }
      resolvedLocationId = location.id;
    } else {
      // No branch supplied — fall back to this business's own primary location
      // rather than rejecting a legitimate request from a new host.
      const { data: primaryLoc, error: primaryErr } = await supabase
        .from('locations')
        .select('id')
        .eq('business_id', businessId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (primaryErr) throw primaryErr;
      resolvedLocationId = primaryLoc?.id ?? null;
    }

    // Free Setup Threshold Check & Fee Guard
    try {
      const { checkFreeTier, logFreeTierUsage, isFreeItemType } = await import('@/lib/services/wallet/free-tier.service');
      const { evaluateFeeGuard, generateInvoiceRef } = await import('@/lib/services/wallet/fee-guard.service');

      if (!isFreeItemType(itemType, category)) {
        const isRoom = itemType === 'room_accommodation' || itemType === 'room';
        const kind = isRoom ? 'room' : 'menu';
        const feeRef = generateInvoiceRef();
        const tierCheck = await checkFreeTier(supabase, businessId, kind);

        if (tierCheck.isFree) {
          await logFreeTierUsage(supabase, businessId, tierCheck.action, feeRef);
        } else {
          await evaluateFeeGuard(businessId, tierCheck.action, feeRef, supabase, tierCheck.cost);
        }
      }
    } catch (feeErr) {
      console.error('[Catalog Create FeeGuard Error]', feeErr);
      if ((feeErr as { code?: string })?.code === 'FREE_TIER_UNAVAILABLE') {
        return NextResponse.json(
          { success: false, error: 'Quota check temporarily unavailable. Please retry.', code: 'FREE_TIER_UNAVAILABLE' },
          { status: 503 }
        );
      }
    }

    // Insert Canonical Catalog Item
    const { data: item, error: insertError } = await supabase
      .from('catalog_items')
      .insert({
        business_id: businessId,
        location_id: resolvedLocationId,
        item_type: itemType,
        name,
        description,
        price,
        category,
        image_url: imageUrl || null,
        metadata,
        is_available: true,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Conditionally initialize inventory
    if (inventoryCount !== undefined && inventoryCount !== null) {
      const { error: invError } = await supabase
        .from('inventory_stock')
        .insert({
          catalog_item_id: item.id,
          stock_quantity: inventoryCount,
          low_stock_threshold: 5,
        });
      if (invError) throw invError;
    }

    const canonicalItem = {
      id: item.id as CatalogItemId,
      branchId: item.location_id,
      name: item.name,
      description: item.description || '',
      imageUrl: item.image_url,
      status: item.is_available ? 'active' : 'inactive',
      addons: [],
      createdAt: item.created_at,
      updatedAt: item.created_at,
      ...(item.item_type === 'food' && {
        kind: 'food_beverage',
        course: item.category,
        dietary: 'veg',
        price: { amountMinor: Number(item.price), currency: 'INR' },
        prepTimeMinutes: null,
        allergens: [],
      }),
      ...(item.item_type === 'room' && {
        kind: 'accommodation',
        roomType: item.category,
        nightlyRate: { amountMinor: Number(item.price), currency: 'INR' },
        capacity: item.metadata?.capacity || null,
        bedType: item.metadata?.bed_type || null,
        amenities: item.metadata?.amenities || [],
        occupancy: { adults: 2, children: 0 },
        inventoryCount: inventoryCount || 1,
      }),
    };

    return NextResponse.json({ data: canonicalItem });
  } catch (error) {
    console.error('[API Catalog POST]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, 'HostCatalogCreatePOST');
