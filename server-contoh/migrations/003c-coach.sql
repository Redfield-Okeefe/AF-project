-- Fase 3C revisi. Jalankan sebagai SQL script, dengan auto-commit aktif.
-- Backup DB dahulu. Tidak membuat tabel OTP baru.
BEGIN;
DO $$
DECLARE ptype record; c record; col smallint;
BEGIN
  IF current_database() <> 'bnr_academy' THEN RAISE EXCEPTION 'Database bukan bnr_academy'; END IF;
  SELECT a.attnum,t.typtype,n.nspname,t.typname INTO ptype
    FROM pg_attribute a JOIN pg_type t ON t.oid=a.atttypid
    JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE a.attrelid='public.auth_challenges'::regclass AND a.attname='purpose' AND NOT a.attisdropped;
  IF NOT FOUND THEN RAISE EXCEPTION 'Kolom purpose tidak tersedia'; END IF;
  col:=ptype.attnum;
  IF ptype.typtype='e' THEN
    EXECUTE format('ALTER TYPE %I.%I ADD VALUE IF NOT EXISTS %L',ptype.nspname,ptype.typname,'register_coach');
    EXECUTE format('ALTER TYPE %I.%I ADD VALUE IF NOT EXISTS %L',ptype.nspname,ptype.typname,'reset_password');
  ELSIF ptype.typtype<>'b' THEN
    RAISE EXCEPTION 'Tipe purpose tidak didukung otomatis; periksa DDL asli';
  END IF;
END $$;
COMMIT;
BEGIN;
DO $$
DECLARE c record; col smallint;
BEGIN
  SELECT attnum INTO col FROM pg_attribute WHERE attrelid='public.auth_challenges'::regclass AND attname='purpose' AND NOT attisdropped;
  FOR c IN SELECT conname,conkey,pg_get_expr(conbin,conrelid) AS expr
    FROM pg_constraint WHERE conrelid='public.auth_challenges'::regclass AND contype='c' AND col=ANY(conkey)
  LOOP
    IF cardinality(c.conkey)<>1 THEN RAISE EXCEPTION 'Constraint purpose gabungan %: perlu review manual',c.conname; END IF;
    -- Preserve the complete old allowed-purpose expression; only extend purpose-only checks.
    IF position('register_coach' IN c.expr)=0 OR position('reset_password' IN c.expr)=0 THEN
      EXECUTE format('ALTER TABLE public.auth_challenges DROP CONSTRAINT %I',c.conname);
      EXECUTE format('ALTER TABLE public.auth_challenges ADD CONSTRAINT %I CHECK ((%s) OR purpose::text IN (%L,%L))',c.conname,c.expr,'register_coach','reset_password');
    END IF;
  END LOOP;
END $$;
ALTER TABLE public.coach_profiles
  ADD COLUMN IF NOT EXISTS registration_whatsapp text,
  ADD COLUMN IF NOT EXISTS registration_review_status text CHECK (registration_review_status IN ('menunggu','aktif','ditolak','nonaktif')),
  ADD COLUMN IF NOT EXISTS registration_rejection_reason text,
  ADD COLUMN IF NOT EXISTS registration_created_at timestamptz NOT NULL DEFAULT now();
-- If v1.5.0 migration was already applied, preserve every challenge and retire its old table.
-- OTPs already issued remain scoped by the unchanged coach HMAC. Any collision aborts.
DO $$
BEGIN
  IF to_regclass('public.coach_registration_otp') IS NOT NULL THEN
    INSERT INTO public.auth_challenges(id,target_email,purpose,code_hash,attempts,created_at,expires_at,consumed_at)
    SELECT id,email,'register_coach',code_hash,attempts,created_at,expires_at,consumed_at FROM public.coach_registration_otp;
    DROP TABLE public.coach_registration_otp;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS auth_challenges_purpose_email_created_idx ON public.auth_challenges(purpose,lower(btrim(target_email)),created_at DESC);
COMMIT;
