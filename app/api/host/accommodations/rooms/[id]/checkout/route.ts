import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';
import { buildStayFolio, CLOSED_ORDER_STATUSES, stayNights } from '@/lib/services/accommodation/stay-folio.util';

export const dynamic = 'force-dynamic';

const ALLOWED_TENDERS = ['CASH', 'CARD', 'UPI', 'SPLIT'];

export const POST = withApiErrorBoundary(async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;

    const { id: roomId } = await params;
    if (!roomId) {
      return NextResponse.json({ success: false, error: 'Room ID required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const hasTender = body.payment_method !== undefined && body.payment_method !== null && body.payment_method !== '';
    const tender = hasTender ? String(body.payment_method).toUpperCase() : '';
    if (hasTender && !ALLOWED_TENDERS.includes(tender)) {
      return NextResponse.json(
        { success: false, error: `Invalid payment method. Use one of ${ALLOWED_TENDERS.join(', ')}.`, code: 'INVALID_TENDER' },
        { status: 400 }
      );
    }
    const paymentMethod = tender || 'CASH';

    // 1. Fetch current room details with category scoped to this business
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select(`
        *,
        category:room_categories(*)
      `)
      .eq('id', roomId)
      .eq('business_id', businessId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ success: false, error: roomError?.message || 'Room not found' }, { status: 404 });
    }

    // Checkout is two calls from the UI: "Check Out" (no tender) releases the room and writes the
    // invoice as ready_for_settlement; the payment modal then calls again WITH a tender to settle
    // that invoice. On a room that is no longer occupied the only valid action is therefore to
    // settle its pending invoice, exactly once. Anything else (double-click, retry) is rejected
    // instead of minting a second invoice.
    if (String(room.status || '').toUpperCase() !== 'OCCUPIED') {
      const notOccupied = (msg: string) =>
        NextResponse.json({ success: false, error: msg, code: 'ROOM_NOT_OCCUPIED' }, { status: 409 });
      if (!hasTender) {
        return notOccupied(`Room is ${String(room.status || 'not occupied').toLowerCase()}; nothing to check out.`);
      }

      const { data: pendingInvoice, error: pendingErr } = await supabase
        .from('orders')
        .select('*')
        .eq('room_id', roomId)
        .eq('business_id', businessId)
        .eq('order_type', 'room_stay')
        .eq('status', 'ready_for_settlement')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pendingErr) {
        console.error('[API Checkout] pending invoice lookup failed', pendingErr);
        return NextResponse.json({ success: false, error: 'Could not load the pending invoice. Please retry.' }, { status: 500 });
      }
      if (!pendingInvoice) return notOccupied('There is no pending invoice to settle for this room.');

      const { data: settledRows, error: settleErr } = await supabase
        .from('orders')
        .update({ status: 'SETTLED', payment_method: tender })
        .eq('id', pendingInvoice.id)
        .eq('business_id', businessId)
        .eq('status', 'ready_for_settlement')
        .select('id');
      if (settleErr) {
        console.error('[API Checkout] settling pending invoice failed', settleErr);
        return NextResponse.json({ success: false, error: 'Could not settle the invoice. Please retry.' }, { status: 500 });
      }
      if (!settledRows || settledRows.length === 0) return notOccupied('This invoice was already settled.');

      const grandTotal = Number(pendingInvoice.grand_total) || 0;
      return NextResponse.json({
        success: true,
        order_id: pendingInvoice.id,
        settled_pending_invoice: true,
        invoice: {
          id: pendingInvoice.id,
          order_id: pendingInvoice.id,
          table_number: pendingInvoice.table_number,
          room_id: roomId,
          guest_name: pendingInvoice.customer_name || 'In-House Guest',
          guest_phone: pendingInvoice.customer_phone || '',
          items: Array.isArray(pendingInvoice.items) ? pendingInvoice.items : [],
          subtotal: Number(pendingInvoice.subtotal) || grandTotal,
          discountType: 'percentage' as const,
          discountValue: 0,
          discountAmount: 0,
          taxAmount: 0,
          grandTotal,
          payment_method: tender,
          isReadOnly: false,
          created_at: pendingInvoice.created_at,
        },
      });
    }

    // 2. The stay's open orders: its own folio ('active' room-stay order) and unpaid room service.
    // A previous guest's invoice still waiting for payment is a different bill and is left alone.
    const { data: activeOrders, error: activeOrdersError } = await supabase
      .from('orders')
      .select('*')
      .eq('room_id', roomId)
      .eq('business_id', businessId)
      .not('status', 'in', CLOSED_ORDER_STATUSES);
    if (activeOrdersError) {
      console.error('[API Checkout] could not load room orders', activeOrdersError);
      return NextResponse.json({ success: false, error: 'Could not load the room bill. Nothing was changed; please retry.' }, { status: 500 });
    }

    // This stay's folio is opened at check-in (created_at = check-in time). An earlier invoice for the
    // room predates the current check-in; a retry after a failed release finds this stay's own one.
    const stayStart = Date.parse(room.check_in_time || room.check_in_date || '') || 0;
    const masterStayOrder = (activeOrders || []).find((o: any) =>
      o.order_type === 'room_stay' && (o.status === 'active' || (Date.parse(o.created_at) || 0) >= stayStart - 60_000));
    const fAndBOrders = (activeOrders || []).filter((o: any) => o.order_type !== 'room_stay');
    const ordersTotal = fAndBOrders.reduce((acc: number, o: any) => acc + (Number(o.grand_total) || 0), 0);

    // 3. Tariff and add-ons for the nights actually stayed, by the same rules as the check-in quote.
    const nowIso = new Date().toISOString();
    const nights = stayNights(room.check_in_time || room.check_in_date, nowIso);
    const folio = buildStayFolio({
      roomId,
      roomNumber: room.room_number,
      categoryName: room.category?.name,
      rate: Number(room.category?.price) || 0,
      nights,
      addons: Array.isArray(room.selected_addons) ? room.selected_addons : [],
    });
    const roomTariffTotal = folio.tariffTotal;
    const addonsTotal = folio.addonsTotal;
    const finalBilledAmount = roomTariffTotal + addonsTotal + ordersTotal;

    // 4. Build consolidated folio items
    const fAndBItems = fAndBOrders.flatMap((o: any) => (Array.isArray(o.items) ? o.items : []));
    const consolidatedItems = [...folio.lines, ...fAndBItems];

    // 5. Write the invoice FIRST, as 'ready_for_settlement'. Nothing about the guest or the room
    // is touched until this is stored, so any failure up to here leaves a fully retryable state.
    const masterPayload = {
      customer_name: room.guest_name || masterStayOrder?.customer_name || 'Guest',
      customer_phone: room.guest_phone || masterStayOrder?.customer_phone || '',
      table_number: `ROOM ${room.room_number}`,
      items: consolidatedItems,
      subtotal: finalBilledAmount,
      grand_total: finalBilledAmount,
      total_amount: finalBilledAmount,
      status: 'ready_for_settlement',
      payment_method: paymentMethod,
    };

    let masterOrderId: string | undefined = masterStayOrder?.id;
    let createdMasterId: string | null = null; // set only when THIS request inserted the invoice

    if (masterStayOrder) {
      const { data: updatedMaster, error: masterErr } = await supabase
        .from('orders')
        .update(masterPayload)
        .eq('id', masterStayOrder.id)
        .eq('business_id', businessId)
        .select('id')
        .single();
      if (masterErr || !updatedMaster) {
        console.error('[API Checkout] master invoice update failed', masterErr);
        return NextResponse.json({ success: false, error: 'Could not save the room invoice. The room was NOT checked out; please retry.' }, { status: 500 });
      }
      masterOrderId = updatedMaster.id;
    } else {
      const { data: newMasterOrder, error: masterErr } = await supabase
        .from('orders')
        .insert({
          business_id: businessId,
          room_id: roomId,
          order_type: 'room_stay',
          order_source: 'POS',
          created_at: room.check_in_time || nowIso,
          ...masterPayload,
        })
        .select('id')
        .single();
      if (masterErr || !newMasterOrder) {
        console.error('[API Checkout] master invoice insert failed', masterErr);
        return NextResponse.json({ success: false, error: 'Could not save the room invoice. The room was NOT checked out; please retry.' }, { status: 500 });
      }
      masterOrderId = newMasterOrder.id;
      createdMasterId = newMasterOrder.id;
    }

    // Link F&B orders to the invoice now (status unchanged) so a retry re-reads the same set.
    if (fAndBOrders.length > 0) {
      const { error: linkErr } = await supabase
        .from('orders')
        .update({ master_order_id: masterOrderId })
        .in('id', fAndBOrders.map((o: any) => o.id))
        .eq('business_id', businessId);
      if (linkErr) {
        console.error('[API Checkout] linking room orders failed', linkErr);
        return NextResponse.json({ success: false, error: 'Could not attach room-service orders to the invoice. The room was NOT checked out; please retry.' }, { status: 500 });
      }
    }

    // 6. Update or insert historical room_stay_logs
    try {
      const { data: openLog } = await supabase
        .from('room_stay_logs')
        .select('id')
        .eq('room_id', roomId)
        .eq('business_id', businessId)
        .is('check_out_time', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openLog) {
        await supabase
          .from('room_stay_logs')
          .update({
            check_out_time: nowIso,
            total_billed_amount: finalBilledAmount
          })
          .eq('id', openLog.id);
      } else if (room.guest_name) {
        await supabase.from('room_stay_logs').insert({
          business_id: businessId,
          room_id: roomId,
          guest_name: room.guest_name,
          guest_phone: room.guest_phone || '',
          id_type: room.id_type || null,
          id_number: room.id_number || null,
          guest_email: room.guest_email || null,
          guest_address: room.guest_address || null,
          guest_id_proof: room.guest_id_proof || null,
          check_in_time: room.check_in_time || room.check_in_date || nowIso,
          check_out_time: nowIso,
          total_guests: room.total_guests || 1,
          purpose_of_visit: room.purpose_of_visit || 'Leisure',
          is_celebration: room.is_celebration || false,
          celebration_type: room.celebration_type || null,
          celebration_note: room.celebration_note || null,
          selected_addons: room.selected_addons || [],
          total_billed_amount: finalBilledAmount
        });
      }
    } catch (logErr) {
      console.error('[API Checkout Stay Log Update Error]', logErr);
    }

    // 7. Release the room. Conditional on OCCUPIED so of two concurrent checkouts only one wins.
    const { data: updatedRoom, error: updateError } = await supabase
      .from('rooms')
      .update({
        status: 'CLEANING',
        check_out_date: nowIso,
        check_out_time: nowIso,
        guest_name: null,
        guest_phone: null,
        guest_id_proof: null,
        id_type: null,
        id_number: null,
        guest_email: null,
        guest_address: null,
        current_guest_id: null,
        total_guests: 1,
        purpose_of_visit: null,
        is_celebration: false,
        celebration_type: null,
        celebration_note: null,
        selected_addons: []
      })
      .eq('id', roomId)
      .eq('business_id', businessId)
      .eq('status', 'OCCUPIED')
      .select(`
        *,
        category:room_categories(*)
      `)
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        // Lost a race with a concurrent checkout that released the room first. Our own invoice (if we
        // created one) would be a duplicate, so remove it and point the room-service orders we linked
        // back at the winner's invoice.
        if (createdMasterId) {
          await supabase.from('orders').delete().eq('id', createdMasterId).eq('business_id', businessId).eq('status', 'ready_for_settlement');
          const { data: winner } = await supabase
            .from('orders').select('id').eq('room_id', roomId).eq('business_id', businessId).eq('order_type', 'room_stay')
            .neq('id', createdMasterId).order('created_at', { ascending: false }).limit(1).maybeSingle();
          await supabase.from('orders').update({ master_order_id: winner?.id ?? null }).eq('master_order_id', createdMasterId).eq('business_id', businessId);
        }
        return NextResponse.json(
          { success: false, error: 'This room was already checked out.', code: 'ROOM_NOT_OCCUPIED' },
          { status: 409 }
        );
      }
      console.error('[API Checkout Room Update Error]', updateError);
      return NextResponse.json({ success: false, error: 'Could not release the room. Nothing was settled; please retry.' }, { status: 500 });
    }

    // 8. The guest is gone, so from here we report problems rather than fail: the invoice and
    // room are already consistent and a retry would be rejected as "not occupied".
    const warnings: string[] = [];

    if (fAndBOrders.length > 0) {
      const { error: settleErr } = await supabase
        .from('orders')
        .update({ status: 'SETTLED' })
        .in('id', fAndBOrders.map((o: any) => o.id))
        .eq('business_id', businessId);
      if (settleErr) {
        console.error('[API Checkout] marking room orders SETTLED failed', settleErr);
        warnings.push('Room-service orders could not be marked settled.');
      }
    }

    if (hasTender) {
      const { error: finalizeErr } = await supabase
        .from('orders')
        .update({ status: 'SETTLED' })
        .eq('id', masterOrderId)
        .eq('business_id', businessId);
      if (finalizeErr) {
        console.error('[API Checkout] marking invoice SETTLED failed', finalizeErr);
        warnings.push('The invoice could not be marked settled; it is saved as ready for settlement.');
      }
    }

    // 9. Fee Guard
    try {
      const { invoiceRefFromId, generateInvoiceRef, evaluateFeeGuard } = await import('@/lib/services/wallet/fee-guard.service');
      const feeRef = masterOrderId ? invoiceRefFromId(masterOrderId) : generateInvoiceRef();
      await evaluateFeeGuard(businessId, 'room_accommodation', feeRef, supabase);
    } catch (feeErr) {
      console.error('[API Checkout FeeGuard Error]', feeErr);
    }

    const invoice = {
      id: masterOrderId,
      order_id: masterOrderId,
      table_number: `ROOM ${room.room_number}`,
      room_id: roomId,
      guest_name: room.guest_name || 'In-House Guest',
      guest_phone: room.guest_phone || '',
      items: consolidatedItems,
      subtotal: finalBilledAmount,
      discountType: 'percentage' as const,
      discountValue: 0,
      discountAmount: 0,
      taxAmount: 0,
      grandTotal: finalBilledAmount,
      payment_method: paymentMethod,
      isReadOnly: false,
      created_at: nowIso
    };

    return NextResponse.json({
      success: true,
      order_id: masterOrderId,
      room: updatedRoom,
      invoice,
      ...(warnings.length > 0 ? { warnings } : {}),
      checkoutSummary: {
        finalBilledAmount,
        roomTariffTotal,
        addonsTotal,
        ordersTotal,
        nights,
        checkoutTime: nowIso
      }
    });
  } catch (error: any) {
    console.error('[API Room Checkout POST Error]', error);
    return NextResponse.json({ success: false, error: 'Checkout failed. Please retry.' }, { status: 500 });
  }
}, 'AccommodationsRoomCheckoutPOST');
