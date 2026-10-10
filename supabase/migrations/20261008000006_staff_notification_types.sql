-- ============================================================================
-- 20261008000006_staff_notification_types.sql   (safe to re-run)
--
-- 20261008000004 restricted staff_notifications.notification_type to
-- WAITER/CHEF/BILL/SERVICE/WALLET_SUSPENDED_LOW_BALANCE, but the stock
-- deduction functions (20261004000003, 20261006000006) insert 'LOW_STOCK_ALERT'
-- inside the same transaction. As soon as any ingredient fell below its
-- threshold, that insert violated the constraint and rolled back the whole
-- inventory deduction for the order.
--
-- Also indexes the lookup the new host alert feed runs (pending alerts per venue).
-- ============================================================================

BEGIN;

ALTER TABLE public.staff_notifications DROP CONSTRAINT IF EXISTS staff_notifications_type_check;
ALTER TABLE public.staff_notifications
    ADD CONSTRAINT staff_notifications_type_check
    CHECK (notification_type = ANY (ARRAY[
        'WAITER', 'CHEF', 'BILL', 'SERVICE',
        'LOW_STOCK_ALERT', 'WALLET_SUSPENDED_LOW_BALANCE'
    ]));

CREATE INDEX IF NOT EXISTS idx_staff_notifications_pending
    ON public.staff_notifications (business_id, created_at DESC)
    WHERE status = 'PENDING';

-- The host alert feed listens for new rows over Realtime.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
       AND NOT EXISTS (
           SELECT 1 FROM pg_publication_tables
           WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'staff_notifications'
       ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_notifications;
    END IF;
END $$;

COMMIT;
