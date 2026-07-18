-- ============================================================
-- RUN THIS IN: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- 1. Add pin_hash column
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- 2. Prevent duplicate phone numbers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_app_user_phone_unique') THEN
    CREATE UNIQUE INDEX idx_app_user_phone_unique ON app_user(phone_number);
  END IF;
END $$;

-- 3. Set PIN hashes for existing users (SHA-256)
-- Coordinator: PIN 1234
UPDATE app_user SET pin_hash = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4' WHERE phone_number = '+23054737266';
-- Operator: PIN 1111
UPDATE app_user SET pin_hash = '0ffe1abd1a08215353c233d6e009613e95eec4253832a761af28ff37ac5a150c' WHERE phone_number = '+23052000101';
-- Technician: PIN 2222
UPDATE app_user SET pin_hash = 'edee29f882543b956620b26d0ee0e7e950399b1c4222f5de05e06425b4c995e9' WHERE phone_number = '+237652278011';
