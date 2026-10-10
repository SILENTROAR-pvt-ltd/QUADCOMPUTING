const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * resolveKitchenBusinessId()
 * Derives business strictly from authenticated session without module-level caching
 * or arbitrary first-business database fallbacks.
 */
export async function resolveKitchenBusinessId(
  supabase: any,
  request?: Request
): Promise<string | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: businesses } = await supabase
      .from('businesses')
      .select('id')
      .eq('host_id', user.id)
      .order('created_at', { ascending: false });

    if (!businesses || businesses.length === 0) return null;

    if (request) {
      try {
        const url = new URL(request.url);
        const paramId =
          url.searchParams.get('business_id') || url.searchParams.get('cafe_id');
        if (paramId && UUID_REGEX.test(paramId)) {
          const matched = businesses.find((b: any) => b.id === paramId);
          if (matched) return matched.id;
        }

        const headerId = request.headers.get('x-business-id');
        if (headerId && UUID_REGEX.test(headerId)) {
          const matched = businesses.find((b: any) => b.id === headerId);
          if (matched) return matched.id;
        }
      } catch {}
    }

    return businesses[0]?.id || null;
  } catch {
    return null;
  }
}
