BEGIN;
DO $$ BEGIN IF current_database()<>'bnr_academy' THEN RAISE EXCEPTION 'Database bukan bnr_academy'; END IF; END $$;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 0 CHECK(session_version>=0),
 ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;
COMMIT;
