-- 1. Staff Profiles
CREATE TABLE IF NOT EXISTS staff_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_number TEXT,
    designation TEXT,
    department TEXT,
    join_date DATE NOT NULL,
    end_date DATE,
    base_salary NUMERIC NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts can access their own staff_profiles" ON staff_profiles
FOR ALL
USING (business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid()))
WITH CHECK (business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid()));

-- 2. Staff Salary Advances (Loans/Early Withdrawals)
CREATE TABLE IF NOT EXISTS staff_advances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff_profiles(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    date_given DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE staff_advances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts can access their own staff_advances" ON staff_advances
FOR ALL
USING (business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid()))
WITH CHECK (business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid()));

-- 3. Operational Expenses
CREATE TABLE IF NOT EXISTS operational_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- Rent, Electricity, Water, WiFi, Other (Custom)
    custom_category_name TEXT, -- Used if category is 'Other'
    amount NUMERIC NOT NULL,
    billing_date DATE NOT NULL,
    status TEXT DEFAULT 'PAID', -- PAID, PENDING
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE operational_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts can access their own operational_expenses" ON operational_expenses
FOR ALL
USING (business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid()))
WITH CHECK (business_id IN (SELECT id FROM businesses WHERE host_id = auth.uid()));
