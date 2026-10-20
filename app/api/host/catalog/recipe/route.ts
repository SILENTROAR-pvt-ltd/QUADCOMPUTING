import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { cleanRecipeLines, saveRecipe } from '@/lib/services/catalog/recipe.service';

export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;

    const catalogItemId = new URL(request.url).searchParams.get('catalogItemId');
    if (!catalogItemId) return NextResponse.json({ error: 'Missing catalogItemId' }, { status: 400 });

    const { data: ingredients, error } = await supabase
      .from('recipe_ingredients')
      .select('*, raw_item:raw_inventory_items(id, item_name, unit, cost_per_unit)')
      .eq('catalog_item_id', catalogItemId)
      .eq('business_id', businessId);
    if (error) throw error;

    // Ingredient cost is the owner's margin input. A staff terminal gets the ingredient names and quantities only.
    const mapped = (ingredients || []).map((ing: any) => {
      const item = Array.isArray(ing.raw_item) ? ing.raw_item[0] : ing.raw_item;
      if (!auth.staff || !item) return { ...ing, raw_item: item };
      const { cost_per_unit: _cost, ...withoutCost } = item;
      return { ...ing, raw_item: withoutCost };
    });
    return NextResponse.json({ ingredients: mapped });
  } catch (error: any) {
    console.error('[API Catalog Recipe GET]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}, 'HostCatalogRecipeGET');

export const POST = withApiErrorBoundary(async function POST(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;

    const body = await request.json().catch(() => ({}));
    const catalogItemId = typeof body?.catalogItemId === 'string' ? body.catalogItemId : '';
    if (!UUID.test(catalogItemId)) return NextResponse.json({ error: 'Missing catalogItemId' }, { status: 400 });

    const cleaned = cleanRecipeLines(body?.ingredients);
    if (!cleaned.ok) return NextResponse.json({ error: cleaned.error }, { status: 400 });

    const result = await saveRecipe(supabase, businessId, catalogItemId, cleaned.lines);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Catalog Recipe POST]', error);
    return NextResponse.json({ error: 'Could not save the recipe. Please try again.' }, { status: 500 });
  }
}, 'HostCatalogRecipePOST');
