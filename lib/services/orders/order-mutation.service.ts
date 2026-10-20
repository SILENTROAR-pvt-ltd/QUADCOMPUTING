import { saveActiveOrder } from '@/lib/store/active-order-store';

export async function executeOrderMutation(
  supabase: any,
  orderData: Record<string, any>,
  existingOrderId: string | null,
  // The status a first save takes when none is given: open for a bill whose settlement follows in the same request.
  insertDefaultStatus: string = 'SETTLED',
): Promise<any> {
  if (existingOrderId) {
    // A field left undefined (the status of a table order that settles in the same request) is not touched.
    const changes = Object.fromEntries(Object.entries(orderData).filter(([, value]) => value !== undefined));
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update(changes)
      .eq('id', existingOrderId)
      .eq('business_id', orderData.business_id)
      .select()
      .maybeSingle();

    if (!updateError && updated) return updated;
  }

  const generatedId = crypto.randomUUID();
  const insertPayload = {
    id: existingOrderId || generatedId,
    ...orderData,
    status: orderData.status ?? insertDefaultStatus,
    created_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertError } = await supabase
    .from('orders')
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) {
    if (insertError.code === '42501' || insertError.message?.includes('row-level security')) {
      console.warn('[OrdersMutation] RLS fallback to in-memory store:', insertError.message);
      saveActiveOrder(insertPayload as any);
      return insertPayload;
    }
    throw insertError;
  }

  return inserted;
}
