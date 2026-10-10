export async function syncCategoryRooms(
  supabase: any,
  businessId: string,
  categoryId: string,
  updatedRooms?: any[],
  deletedRoomIds?: any[],
  newRoomNumbers?: any[]
) {
  if (Array.isArray(updatedRooms) && updatedRooms.length > 0) {
    for (const item of updatedRooms) {
      if (item.id && item.room_number?.trim()) {
        await supabase.from('rooms').update({ room_number: item.room_number.trim() }).eq('id', item.id).eq('business_id', businessId);
      }
    }
  }

  if (Array.isArray(deletedRoomIds) && deletedRoomIds.length > 0) {
    for (const roomId of deletedRoomIds) {
      await supabase.from('rooms').delete().eq('id', roomId).eq('business_id', businessId).neq('status', 'OCCUPIED');
    }
  }

  if (Array.isArray(newRoomNumbers) && newRoomNumbers.length > 0) {
    const roomsToInsert = newRoomNumbers
      .map((r: any) => String(r).trim())
      .filter(Boolean)
      .map((num: string, idx: number) => ({
        business_id: businessId,
        category_id: categoryId,
        room_number: num,
        status: 'VACANT',
        qr_code_hash: `ROOM_${categoryId.slice(0, 8)}_${num.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${idx}`,
      }));
    if (roomsToInsert.length > 0) {
      const { data: insertedRooms } = await supabase.from('rooms').insert(roomsToInsert).select();

      // Free Setup Threshold Check & Fee Guard for newly added room units
      try {
        const { checkFreeTier, logFreeTierUsage } = await import('@/lib/services/wallet/free-tier.service');
        const { evaluateFeeGuard, generateInvoiceRef } = await import('@/lib/services/wallet/fee-guard.service');

        const tierCheck = await checkFreeTier(supabase, businessId, 'room');
        const totalBatch = insertedRooms?.length || roomsToInsert.length;
        const beforeCount = Math.max(0, tierCheck.existingCount - totalBatch);
        const freeSlots = Math.max(0, tierCheck.threshold - beforeCount);
        const freeCount = Math.min(totalBatch, freeSlots);
        const chargedCount = totalBatch - freeCount;

        const ref = generateInvoiceRef();

        if (freeCount > 0) {
          await logFreeTierUsage(supabase, businessId, 'room_creation', `${ref}-FREE(${freeCount})`);
        }

        if (chargedCount > 0) {
          const totalFee = chargedCount * 10.00;
          await evaluateFeeGuard(businessId, 'room_creation', ref, supabase, totalFee);
        }
      } catch (guardErr) {
        console.error('[Accommodations syncCategoryRooms FeeGuard Error]', guardErr);
      }
    }
  }
}
