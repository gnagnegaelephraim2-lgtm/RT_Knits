-- ============================================================
-- NITA AUTH MIGRATION — Enable PIN-based authentication
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add pin_hash column for PIN-based authentication
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- 2. Create unique index on phone_number to prevent duplicates
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_app_user_phone_unique') THEN
    CREATE UNIQUE INDEX idx_app_user_phone_unique ON app_user(phone_number);
  END IF;
END $$;

-- 3. Update existing users with their PIN hashes (SHA-256)
-- Coordinator: PIN 1234
UPDATE app_user SET pin_hash = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4' WHERE phone_number = '+23054737266';
-- Operator Priya: PIN 1111
UPDATE app_user SET pin_hash = '0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c' WHERE phone_number = '+23052000101';
-- Technician Nelson: PIN 2222
UPDATE app_user SET pin_hash = 'edee29f882543b956620b26d0ee0e7e950399b1c4222f5de05e06425b4c995e9' WHERE phone_number = '+237652278011';

-- 4. Insert default test users if they don't exist
INSERT INTO app_user (user_id, full_name, role, phone_number, pin_hash, whatsapp_verified)
VALUES
  ('a0b19318-f23d-407b-8e80-cb59a42c4624', 'Nelson Fodjo', 'coordinator', '+23054737266', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', true),
  ('aa3a190a-dbca-49d7-84fe-19a9dcf18f01', 'Priya Singh', 'operator', '+23052000101', '0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c', true),
  ('aa3a190a-dbca-49d7-84fe-19a9dcf18f02', 'Jean-Marc Rughoo', 'technician', '+237652278011', 'edee29f882543b956620b26d0ee0e7e950399b1c4222f5de05e06425b4c995e9', true)
ON CONFLICT (phone_number) DO UPDATE SET
  pin_hash = EXCLUDED.pin_hash,
  whatsapp_verified = EXCLUDED.whatsapp_verified;
