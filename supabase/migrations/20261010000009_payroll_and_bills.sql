-- ============================================================================
-- 20261010000009_payroll_and_bills.sql   (safe to re-run)
--
-- Payroll: salary payments per month, so "still to pay" closes when a salary is
-- paid (salary - advances - payments). Advances get a payment method.
-- Bills: vendor, bill number, payment method, due date, paid date and a monthly
-- repeat flag on operational_expenses, so recurring bills (rent, power, internet)
-- can be added each month in one tap and overdue ones stand out.
-- Row level security follows the venue's host and staff.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.staff_salary_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    staff_id uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
    period text NOT NULL CHECK (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
    amount numeric NOT NULL CHECK (amount > 0),
    paid_on date NOT NULL DEFAULT CURRENT_DATE,
    method text NOT NULL DEFAULT 'CASH' CHECK (method IN ('CASH', 'UPI', 'BANK', 'OTHER')),
    notes text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_salary_payments_biz_period ON public.staff_salary_payments (business_id, period);

ALTER TABLE public.staff_advances ADD COLUMN IF NOT EXISTS method text DEFAULT 'CASH';
CREATE INDEX IF NOT EXISTS idx_staff_advances_biz_date ON public.staff_advances (business_id, date_given);

ALTER TABLE public.operational_expenses ADD COLUMN IF NOT EXISTS vendor_name text;
ALTER TABLE public.operational_expenses ADD COLUMN IF NOT EXISTS reference text;
ALTER TABLE public.operational_expenses ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.operational_expenses ADD COLUMN IF NOT EXISTS due_date date;
ALTER TABLE public.operational_expenses ADD COLUMN IF NOT EXISTS paid_on date;
ALTER TABLE public.operational_expenses ADD COLUMN IF NOT EXISTS is_recurring boolean NOT NULL DEFAULT false;
ALTER TABLE public.operational_expenses ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_operational_expenses_biz_date ON public.operational_expenses (business_id, billing_date DESC);

ALTER TABLE public.staff_salary_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Host and staff access staff_salary_payments" ON public.staff_salary_payments;
CREATE POLICY "Host and staff access staff_salary_payments" ON public.staff_salary_payments
    FOR ALL TO authenticated
    USING (business_id = ANY(public.get_auth_business_ids()))
    WITH CHECK (business_id = ANY(public.get_auth_business_ids()));
REVOKE ALL ON public.staff_salary_payments FROM anon;
