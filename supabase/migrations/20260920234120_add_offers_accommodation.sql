ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS offers_accommodation BOOLEAN DEFAULT false;
