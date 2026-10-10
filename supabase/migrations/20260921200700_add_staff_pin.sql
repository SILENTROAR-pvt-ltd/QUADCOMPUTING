-- Staff Quick-PIN for POS Access Control
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS staff_pin TEXT DEFAULT NULL;

COMMENT ON COLUMN businesses.staff_pin IS 'Optional 4-digit PIN for cashier POS access without main credentials';
