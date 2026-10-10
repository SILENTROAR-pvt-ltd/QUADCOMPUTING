import { adminDb } from '@/lib/supabase/admin';

const IS_UUID = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export async function updateKitchenTicket(
  _supabase: any,
  businessId: string,
  id: string,
  status: string,
  items?: any[],
  staffId?: string
) {
  const admin = adminDb();

  // If item checkbox state updated, persist to ticket items
  if (items && Array.isArray(items)) {
    let updateQuery = admin.from('kitchen_tickets').update({ items }).eq('business_id', businessId);
    if (IS_UUID(id)) {
      updateQuery = updateQuery.eq('id', id);
    } else {
      updateQuery = updateQuery.eq('ticket_number', id);
    }
    await updateQuery;
  }

  // Resolve actual ticket UUID if ticket_number was passed
  let resolvedTicketId = id;
  if (!IS_UUID(id)) {
    const { data: found } = await admin
      .from('kitchen_tickets')
      .select('id')
      .eq('business_id', businessId)
      .eq('ticket_number', id)
      .maybeSingle();
    if (found?.id) {
      resolvedTicketId = found.id;
    }
  }

  if (IS_UUID(resolvedTicketId)) {
    const { data, error } = await admin.rpc('update_kot_status', {
      p_ticket_id: resolvedTicketId,
      p_new_status: status,
      p_staff_id: staffId || null,
    });
    if (error) {
      throw new Error(error.message);
    }
    return data?.ticket || { id: resolvedTicketId, status };
  }

  return { id, status };
}
