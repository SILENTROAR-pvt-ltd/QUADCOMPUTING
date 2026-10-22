-- ============================================================================
-- 20261022000006_stay_booking_alert_type.sql   (safe to re-run)
--
-- staff_notifications accepts the STAY_BOOKING alert: a guest reserving a room rings the host's bell at once (the floor
-- ping on staff_notifications, migration 20261022000003, carries it to every host screen). Until this runs the database
-- refuses the type, the booking still succeeds, and the desk sees the reservation only in its lists.
-- The list below is the one from 20261016000008_event_interest_alert_type.sql plus STAY_BOOKING.
-- ============================================================================

BEGIN;

ALTER TABLE public.staff_notifications DROP CONSTRAINT IF EXISTS staff_notifications_type_check;
ALTER TABLE public.staff_notifications
    ADD CONSTRAINT staff_notifications_type_check
    CHECK (notification_type = ANY (ARRAY[
        'WAITER', 'CHEF', 'BILL', 'SERVICE',
        'LOW_STOCK_ALERT', 'WALLET_SUSPENDED_LOW_BALANCE',
        'OFFER_REDEEM', 'OFFER_INQUIRY',
        'EVENT_INTEREST',
        'STAY_BOOKING'
    ]));

COMMIT;
