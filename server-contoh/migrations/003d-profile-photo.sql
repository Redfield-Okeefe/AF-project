-- Backup before running. No new tables; private profile photos stored in users.
BEGIN;
DO $$ BEGIN IF current_database()<>'bnr_academy' THEN RAISE EXCEPTION 'Database bukan bnr_academy'; END IF; END $$;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS profile_photo_jpeg bytea CHECK(octet_length(profile_photo_jpeg)<=262144);
COMMIT;
