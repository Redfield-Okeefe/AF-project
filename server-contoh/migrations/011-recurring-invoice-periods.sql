-- Backup first; run as one script, no data deletion.
BEGIN;
DO $$ BEGIN IF current_database()<>'bnr_academy' THEN RAISE EXCEPTION 'Database bukan bnr_academy'; END IF; END $$;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS recurring_fee_type_id uuid REFERENCES public.fee_types(id) ON DELETE RESTRICT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS week_start date;
UPDATE public.invoices i SET recurring_fee_type_id=x.fee_id
FROM (SELECT invoice_id,min(fee_type_id::text)::uuid AS fee_id FROM public.invoice_items GROUP BY invoice_id HAVING count(DISTINCT fee_type_id)=1 AND count(fee_type_id)=count(*)) x
WHERE i.id=x.invoice_id AND i.invoice_type='bulanan' AND i.recurring_fee_type_id IS NULL;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_invoice_type_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_invoice_type_check CHECK(invoice_type IN ('pendaftaran','bulanan','mingguan','per_latihan','lainnya'));
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS ck_bnr_invoice_week;
ALTER TABLE public.invoices ADD CONSTRAINT ck_bnr_invoice_week CHECK(
 (invoice_type='mingguan' AND week_start IS NOT NULL AND recurring_fee_type_id IS NOT NULL AND period_month IS NOT NULL
  AND extract(isodow FROM week_start)=1 AND period_month=date_trunc('month',week_start::timestamp)::date)
 OR (invoice_type<>'mingguan' AND week_start IS NULL));
DROP INDEX IF EXISTS public.uq_bnr_monthly_invoice;
CREATE UNIQUE INDEX IF NOT EXISTS uq_bnr_monthly_invoice_fee ON public.invoices(player_id,period_month,recurring_fee_type_id) NULLS NOT DISTINCT WHERE invoice_type='bulanan' AND status<>'dibatalkan';
CREATE UNIQUE INDEX IF NOT EXISTS uq_bnr_weekly_invoice_fee ON public.invoices(player_id,week_start,recurring_fee_type_id) WHERE invoice_type='mingguan' AND status<>'dibatalkan';
COMMIT;
