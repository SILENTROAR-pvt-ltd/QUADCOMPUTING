-- ============================================================================
-- 20261016000008_event_interest_alert_type.sql   (safe to re-run)
--
-- staff_notifications accepts the EVENT_INTEREST alert ("a guest is interested in your event").
-- The live test of the events pipeline found the database refusing that type, so the lounge team was never told.
-- The list below is the one from 20261010000002_offer_requests.sql plus EVENT_INTEREST.
-- ============================================================================

BEGIN;

ALTER TABLE public.staff_notifications DROP CONSTRAINT IF EXISTS staff_notifications_type_check;
ALTER TABLE public.staff_notifications
    ADD CONSTRAINT staff_notifications_type_check
    CHECK (notification_type = ANY (ARRAY[
        'WAITER', 'CHEF', 'BILL', 'SERVICE',
        'LOW_STOCK_ALERT', 'WALLET_SUSPENDED_LOW_BALANCE',
        'OFFER_REDEEM', 'OFFER_INQUIRY',
        'EVENT_INTEREST'
    ]));

COMMIT;
