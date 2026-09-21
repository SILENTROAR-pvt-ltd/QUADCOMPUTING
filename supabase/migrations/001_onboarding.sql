-- Profiles: Base identity for both hosts and guests
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    role TEXT CHECK (role IN ('host', 'guest')) NOT NULL,
    full_name TEXT NOT NULL,
    gender TEXT,
    dob DATE,
    global_wallet_balance DECIMAL(10,2) DEFAULT 0.00,
    referral_code TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Businesses: A host can own multiple business entities
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    categories TEXT[] NOT NULL,
    gst_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Locations: A business can have multiple physical branches/locations
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    branch_name TEXT NOT NULL,
    state TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    qr_code_hash TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
