-- supabase/migrations/005_banking_details.sql

ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_ifsc_code TEXT,
ADD COLUMN IF NOT EXISTS upi_id TEXT;
