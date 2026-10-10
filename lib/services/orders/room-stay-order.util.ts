import { sanitizeUuid } from './order-uuid.util';

export async function findActiveRoomStayOrder(
  supabase: any,
  roomId: string | null
): Promise<{ masterOrderId: string | null; customerName: string | null; customerPhone: string | null }> {
  if (!roomId) return { masterOrderId: null, customerName: null, customerPhone: null };

  try {
    const { data: activeMaster } = await supabase
      .from('orders')
      .select('id, customer_name, customer_phone')
      .eq('room_id', roomId)
      .eq('order_type', 'room_stay')
      // Only the current stay's open folio; a checked-out guest's invoice awaiting payment is not it.
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeMaster?.id) {
      return {
        masterOrderId: sanitizeUuid(activeMaster.id),
        customerName: activeMaster.customer_name || null,
        customerPhone: activeMaster.customer_phone || null,
      };
    }
  } catch {}

  return { masterOrderId: null, customerName: null, customerPhone: null };
}
