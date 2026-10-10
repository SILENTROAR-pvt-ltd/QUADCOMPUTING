-- ============================================================================
-- 20261008000001_zreport_ist_and_lockdown.sql
--
-- generate_daily_z_report fixes:
--  1. Day boundaries were UTC, so an Indian venue's 00:00-05:30 IST sales landed on the
--     previous day. A business day is now an IST calendar day.
--  2. status was matched as exactly 'settled'; room checkout writes 'SETTLED', so those
--     bills never reached the report. Both spellings are counted.
--  3. The function is SECURITY DEFINER, takes any p_business_id and was granted to anon:
--     anyone could read any venue's revenue. It now requires service_role or the venue's owner.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.generate_daily_z_report(
    p_business_id UUID,
    p_date DATE DEFAULT (timezone('Asia/Kolkata', now()))::date
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_report JSONB;
    v_start_ts TIMESTAMPTZ := (p_date::timestamp AT TIME ZONE 'Asia/Kolkata');
    v_end_ts TIMESTAMPTZ := ((p_date + 1)::timestamp AT TIME ZONE 'Asia/Kolkata');
    v_role TEXT := COALESCE(auth.role(), current_setting('request.jwt.claim.role', true), '');
BEGIN
    IF v_role <> 'service_role' THEN
        IF auth.uid() IS NULL OR NOT EXISTS (
            SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.host_id = auth.uid()
        ) THEN
            RAISE EXCEPTION 'not authorized for this venue' USING ERRCODE = '42501';
        END IF;
    END IF;

    SELECT jsonb_build_object(
        'business_id', p_business_id,
        'date', p_date,
        'time_range', jsonb_build_object('start', v_start_ts, 'end', v_end_ts - interval '1 millisecond'),
        'summary', jsonb_build_object(
            'gross_revenue', COALESCE(ROUND(SUM(o.subtotal)::numeric, 2), 0.00),
            'total_discounts', COALESCE(ROUND(SUM(COALESCE(o.discount_amount, 0))::numeric, 2), 0.00),
            'net_revenue', COALESCE(ROUND(SUM(o.subtotal - COALESCE(o.discount_amount, 0))::numeric, 2), 0.00),
            'cgst', COALESCE(ROUND(SUM(COALESCE(o.tax_amount, 0) / 2.0)::numeric, 2), 0.00),
            'sgst', COALESCE(ROUND(SUM(COALESCE(o.tax_amount, 0) / 2.0)::numeric, 2), 0.00),
            'total_tax', COALESCE(ROUND(SUM(COALESCE(o.tax_amount, 0))::numeric, 2), 0.00),
            'grand_total', COALESCE(ROUND(SUM(o.grand_total)::numeric, 2), 0.00)
        ),
        'payment_breakdown', jsonb_build_object(
            'cash', COALESCE(ROUND(SUM(CASE WHEN LOWER(COALESCE(o.payment_method, '')) = 'cash' THEN o.grand_total ELSE 0 END)::numeric, 2), 0.00),
            'upi', COALESCE(ROUND(SUM(CASE WHEN LOWER(COALESCE(o.payment_method, '')) = 'upi' THEN o.grand_total ELSE 0 END)::numeric, 2), 0.00),
            'wallet_redemption', COALESCE(ROUND(SUM(CASE WHEN LOWER(COALESCE(o.payment_method, '')) LIKE '%wallet%' THEN o.grand_total ELSE 0 END)::numeric, 2), 0.00),
            'card', COALESCE(ROUND(SUM(CASE WHEN LOWER(COALESCE(o.payment_method, '')) = 'card' THEN o.grand_total ELSE 0 END)::numeric, 2), 0.00),
            'other', COALESCE(ROUND(SUM(CASE WHEN LOWER(COALESCE(o.payment_method, '')) NOT IN ('cash', 'upi', 'card') AND LOWER(COALESCE(o.payment_method, '')) NOT LIKE '%wallet%' THEN o.grand_total ELSE 0 END)::numeric, 2), 0.00)
        ),
        'operations', jsonb_build_object(
            'total_settled_orders', COUNT(o.id),
            'average_order_value', CASE
                WHEN COUNT(o.id) > 0 THEN ROUND((SUM(o.grand_total) / COUNT(o.id))::numeric, 2)
                ELSE 0.00
            END
        ),
        'gst_compliance', jsonb_build_object(
            'gst_rate_percent', 5.0,
            'cgst_rate_percent', 2.5,
            'sgst_rate_percent', 2.5,
            'taxable_amount', COALESCE(ROUND(SUM(o.subtotal - COALESCE(o.discount_amount, 0))::numeric, 2), 0.00),
            'cgst_amount', COALESCE(ROUND(SUM(COALESCE(o.tax_amount, 0) / 2.0)::numeric, 2), 0.00),
            'sgst_amount', COALESCE(ROUND(SUM(COALESCE(o.tax_amount, 0) / 2.0)::numeric, 2), 0.00),
            'total_gst_amount', COALESCE(ROUND(SUM(COALESCE(o.tax_amount, 0))::numeric, 2), 0.00)
        )
    )
    INTO v_report
    FROM public.orders o
    WHERE o.business_id = p_business_id
      AND LOWER(o.status) = 'settled'
      AND o.created_at >= v_start_ts
      AND o.created_at < v_end_ts;

    RETURN v_report;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_daily_z_report(UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_daily_z_report(UUID, DATE) TO authenticated, service_role;

COMMIT;
