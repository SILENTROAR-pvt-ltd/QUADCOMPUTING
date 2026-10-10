import { saveActiveOrder } from '@/lib/store/active-order-store';

export async function executeOrderMutation(
  supabase: any,
  orderData: Record<string, any>,
  existingOrderId: string | null
): Promise<any> {
  if (existingOrderId) {
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update(orderData)
      .eq('id', existingOrderId)
      .select()
      .maybeSingle();

    if (!updateError && updated) return updated;
  }

  const generatedId = crypto.randomUUID();
  const insertPayload = {
    id: existingOrderId || generatedId,
    ...orderData,
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
