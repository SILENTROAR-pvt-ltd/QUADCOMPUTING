ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS owner_cafe_id TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS ecosystem_statement TEXT,
    ADD COLUMN IF NOT EXISTS categories_handled TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 0;

ALTER TABLE profiles
    ADD CONSTRAINT profiles_owner_cafe_id_format
    CHECK (owner_cafe_id IS NULL OR owner_cafe_id ~ '^HOST-CF-[0-9A-F]{4}-[0-9A-Z]{4}$');

ALTER TABLE locations
    ADD COLUMN IF NOT EXISTS pincode TEXT;

ALTER TABLE locations
    ADD CONSTRAINT locations_pincode_format
    CHECK (pincode IS NULL OR pincode ~ '^[0-9]{6}$');

CREATE INDEX IF NOT EXISTS businesses_host_id_idx ON businesses(host_id);
CREATE INDEX IF NOT EXISTS locations_business_id_idx ON locations(business_id);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_owner_cafe_id_idx ON profiles(owner_cafe_id);
