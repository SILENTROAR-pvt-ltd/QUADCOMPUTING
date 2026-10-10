-- =============================================================================
-- 20261006000005_generate_daily_z_report_rpc.sql
-- PHASE 2C: Advanced Analytics, Z-Reports & Financial Reconciliation
--
-- Provides transactional single-pass daily Z-Report generation
-- strictly computed from orders where status = 'settled'.
-- Aggregates CGST, SGST, Payment Tenders, and AOV.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.generate_daily_z_report(
    p_business_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_report JSONB;
    v_start_ts TIMESTAMPTZ := (p_date::timestamp at time zone 'UTC');
    v_end_ts TIMESTAMPTZ := ((p_date + interval '1 day')::timestamp at time zone 'UTC');
BEGIN
    SELECT jsonb_build_object(
        'business_id', p_business_id,
        'date', p_date,
        'time_range', jsonb_build_object(
            'start', v_start_ts,
            'end', v_end_ts
        ),
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
      AND o.status = 'settled'
      AND o.created_at >= v_start_ts
      AND o.created_at < v_end_ts;

    RETURN v_report;
END;
$$;

-- Grant execution to authenticated hosts, service role, and anon
GRANT EXECUTE ON FUNCTION public.generate_daily_z_report(UUID, DATE) TO authenticated, service_role, anon;

COMMIT;
