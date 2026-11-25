-- Run once in bnr_academy; safe to rerun. No existing rows are deleted.
BEGIN;
ALTER TABLE public.coach_profiles
  ADD COLUMN IF NOT EXISTS registration_whatsapp text,
  ADD COLUMN IF NOT EXISTS registration_review_status text CHECK (registration_review_status IN ('menunggu','aktif','ditolak','nonaktif')),
  ADD COLUMN IF NOT EXISTS registration_rejection_reason text,
  ADD COLUMN IF NOT EXISTS registration_created_at timestamptz NOT NULL DEFAULT now();
-- Separate coach OTP scope avoids changing the existing activate_player purpose constraint.
CREATE TABLE IF NOT EXISTS public.coach_registration_otp (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);
CREATE INDEX IF NOT EXISTS coach_registration_otp_email_created_idx
  ON public.coach_registration_otp(email, created_at DESC);
COMMIT;
