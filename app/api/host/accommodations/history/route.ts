import { NextResponse } from 'next/server';
import { requireHost } from '@/lib/auth/guards';
import { calculateNights, computeStayHistoryMetrics } from '@/lib/utils/accommodations';
import type { HistoricalStayRecord } from '@/types';
import { withApiErrorBoundary } from '@/lib/middleware/error-handler';

export const dynamic = 'force-dynamic';

export const GET = withApiErrorBoundary(async function GET(request: Request) {
  try {
    const auth = await requireHost(request);
    if (auth.error) return auth.error;
    const { businessId, supabase } = auth;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const roomId = searchParams.get('room_id')?.trim();
    const categoryId = searchParams.get('category_id')?.trim();
    const startDate = searchParams.get('start_date')?.trim();
    const endDate = searchParams.get('end_date')?.trim();
    const parsedLimit = parseInt(searchParams.get('limit') || '100', 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 500) : 100;

    let query = supabase
      .from('room_stay_logs')
      .select(`
        *,
        room:rooms (
          id,
          room_number,
          category:room_categories (
            id,
            name,
            price,
            photos,
            amenities,
            addons
          )
        )
      `)
      .eq('business_id', businessId)
      .order('check_out_time', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (roomId) {
      query = query.eq('room_id', roomId);
    }

    if (startDate) {
      query = query.gte('check_out_time', startDate);
    }

    if (endDate) {
      query = query.lte('check_out_time', endDate);
    }

    if (search) {
      // `search` lands inside a PostgREST .or() expression: commas, parentheses and wildcards
      // would let a caller inject extra conditions, so strip the characters PostgREST treats specially.
      const safeSearch = search.replace(/[,()%*_\\"'`:;]/g, '').trim().slice(0, 64);
      if (safeSearch) {
        query = query.or(`guest_name.ilike.%${safeSearch}%,guest_phone.ilike.%${safeSearch}%`);
      }
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      console.error('[API Accommodations History GET Error]', logsError);
      return NextResponse.json({ success: false, error: logsError.message }, { status: 500 });
    }

    let filteredLogs = logs || [];
    if (categoryId && categoryId !== 'ALL') {
      filteredLogs = filteredLogs.filter(log => log.room?.category?.id === categoryId);
    }

    const enrichedStays: HistoricalStayRecord[] = filteredLogs.map((log: any) => {
      const roomNumber = log.room?.room_number || 'Room';
      const categoryName = log.room?.category?.name || 'Standard Accommodation';
      const categoryPrice = Number(log.room?.category?.price) || 0;
      const nights = calculateNights(log.check_in_time, log.check_out_time);
      const calculatedTariff = categoryPrice * nights;
      const totalBilled = Number(log.total_billed_amount) || calculatedTariff;

      let idType = log.id_type || null;
      let idNumber = log.id_number || null;
      if (!idType && !idNumber && log.guest_id_proof) {
        if (log.guest_id_proof.includes(':')) {
          const parts = log.guest_id_proof.split(':');
          idType = parts[0].trim();
          idNumber = parts.slice(1).join(':').trim();
        } else {
          idType = 'Govt ID';
          idNumber = log.guest_id_proof.trim();
        }
      }

      return {
        ...log,
        id_type: idType,
        id_number: idNumber,
        guest_email: log.guest_email || null,
        guest_address: log.guest_address || null,
        nights,
        status: log.check_out_time ? 'SETTLED' : 'IN_HOUSE',
        room_number: roomNumber,
        category_name: categoryName,
        category_price: categoryPrice,
        calculated_tariff: calculatedTariff,
        total_billed_amount: totalBilled
      };
    });

    const metrics = computeStayHistoryMetrics(enrichedStays);

    return NextResponse.json({
      success: true,
      stays: enrichedStays,
      metrics
    });
  } catch (error: any) {
    console.error('[API Accommodations History GET Exception]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}, 'AccommodationsHistoryGET');
