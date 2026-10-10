export async function resolveBusinessId(
  requestUrl: string,
  supabase: any,
  explicitBusinessId?: string
): Promise<string> {
  if (explicitBusinessId) return explicitBusinessId;

  const { searchParams } = new URL(requestUrl);
  const rawParam =
    searchParams.get('cafe_id') ||
    searchParams.get('venue') ||
    searchParams.get('business_id') ||
    searchParams.get('venue_id') ||
    searchParams.get('branchId');

  const uuidMatch = rawParam
    ? rawParam.match(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
      )
    : null;
  let bizId = uuidMatch
    ? uuidMatch[0]
    : rawParam && rawParam !== 'undefined' && rawParam !== 'null'
    ? rawParam.trim()
    : null;

  if (
    bizId &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      bizId
    )
  ) {
    bizId = null;
  }

  if (!bizId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: b } = await supabase
          .from('businesses')
          .select('id')
          .eq('host_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (b) bizId = b.id;
      }
    } catch {}
  }

  if (!bizId) {
    throw new Error('Business not found');
  }

  return bizId;
}
