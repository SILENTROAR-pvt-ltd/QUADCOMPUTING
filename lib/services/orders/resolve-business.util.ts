import { isUuid } from './order-uuid.util';

/**
 * resolveOrderBusinessId()
 * Resolves business strictly from authenticated host context or validated UUID candidate.
 * Never falls back to default constants or open database scans.
 */
export async function resolveOrderBusinessId(
  supabase: any,
  request?: Request,
  body?: any
): Promise<string | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) {
      const { data: biz } = await supabase
        .from('businesses')
        .select('id')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (biz?.id && isUuid(biz.id)) return biz.id;
    }
  } catch {}

  const candidate =
    body?.business_id || body?.cafe_id || request?.headers?.get('x-business-id');
  if (isUuid(candidate)) return candidate;

  if (request) {
    try {
      const url = new URL(request.url);
      const param =
        url.searchParams.get('business_id') || url.searchParams.get('cafe_id');
      if (isUuid(param)) return param;
    } catch {}
  }

  return null;
}
