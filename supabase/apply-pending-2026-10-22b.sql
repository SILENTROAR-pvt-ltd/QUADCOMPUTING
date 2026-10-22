-- Paste once into the Supabase SQL editor (production). Safe to re-run.
-- 20261022000006_stay_booking_alert_type.sql: lets a guest's new room reservation ring the host's bell (STAY_BOOKING).

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
