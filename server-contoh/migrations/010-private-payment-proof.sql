-- Backup bnr_academy before executing this entire script.
BEGIN;
DO $$ BEGIN IF current_database()<>'bnr_academy' THEN RAISE EXCEPTION 'Database bukan bnr_academy'; END IF; END $$;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS proof_jpeg bytea CHECK(octet_length(proof_jpeg)<=1048576);
COMMIT;
