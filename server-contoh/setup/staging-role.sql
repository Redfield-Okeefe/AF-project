-- One-time setup ONLY on the Neon staging database, via the direct neondb_owner connection.
-- Run as a complete script. No password in this file. Set password with psql \password bnr_app.
BEGIN;
DO $$
BEGIN
  IF current_database() <> 'bnr_academy' OR current_user <> 'neondb_owner' THEN
    RAISE EXCEPTION 'Pilih koneksi Neon bnr_academy sebagai neondb_owner';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='bnr_app') THEN
    RAISE EXCEPTION 'Role bnr_app sudah ada; hentikan dan periksa hak akses, jangan timpa';
  END IF;
END $$;
CREATE ROLE bnr_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
GRANT CONNECT ON DATABASE bnr_academy TO bnr_app;
GRANT USAGE ON SCHEMA public TO bnr_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
 public.users, public.coach_profiles, public.auth_challenges,
 public.account_activation_tokens, public.programs, public.players,
 public.registrations, public.classes, public.coach_assignments,
 public.class_enrollments, public.training_sessions, public.attendance,
 public.assessments, public.announcements, public.fee_types, public.invoices,
 public.invoice_items, public.payment_accounts, public.payments, public.news,
 public.public_media
 TO bnr_app;
GRANT INSERT ON TABLE public.audit_logs TO bnr_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO bnr_app;
DO $$
BEGIN
 IF pg_has_role('bnr_app','neon_superuser','MEMBER')
    OR has_schema_privilege('bnr_app','public','CREATE')
    OR has_database_privilege('bnr_app','bnr_academy','CREATE')
    OR has_table_privilege('bnr_app','public.audit_logs','DELETE')
    OR has_table_privilege('bnr_app','public.audit_logs','UPDATE') THEN
   RAISE EXCEPTION 'Hak akses bnr_app terlalu luas; transaksi dibatalkan';
 END IF;
END $$;
COMMIT;
