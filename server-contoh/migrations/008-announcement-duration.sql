-- Jalankan seluruh script setelah backup database lokal.
BEGIN;
DO $$ BEGIN
 IF current_database() <> 'bnr_academy' THEN RAISE EXCEPTION 'Database bukan bnr_academy'; END IF;
END $$;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_audience_check;
UPDATE public.announcements SET audience='pemain' WHERE audience='orang_tua';
ALTER TABLE public.announcements ADD CONSTRAINT announcements_audience_check CHECK(audience IN ('semua','pemain','pelatih'));
COMMIT;
