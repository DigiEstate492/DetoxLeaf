-- Invoices: every order gets a consecutive invoice number per financial year the moment it is paid
-- online, or the moment a cash-on-delivery order is placed. Test orders use a separate TEST series
-- so live numbering has no gaps. Safe to run more than once.
CREATE TABLE IF NOT EXISTS public.invoices (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id),
  invoice_number text NOT NULL UNIQUE,
  series text NOT NULL,
  seq integer NOT NULL CHECK (seq > 0),
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (series, seq)
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.invoices FROM anon, authenticated;
GRANT ALL ON public.invoices TO service_role;
GRANT SELECT ON public.invoices TO authenticated;
DROP POLICY IF EXISTS staff_read ON public.invoices;
CREATE POLICY staff_read ON public.invoices FOR SELECT TO authenticated USING ((SELECT detoxleaf_private.is_staff()));
DROP POLICY IF EXISTS customer_read ON public.invoices;
CREATE POLICY customer_read ON public.invoices FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.orders o WHERE o.id=order_id AND o.customer_id=(SELECT auth.uid())));

-- Indian financial year runs April to March, e.g. 2026-27.
CREATE OR REPLACE FUNCTION detoxleaf_private.issue_invoice(oid uuid, order_mode text, at timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  local_at timestamp := at AT TIME ZONE 'Asia/Kolkata';
  start_year integer;
  series_n text;
  next_seq integer;
BEGIN
  IF EXISTS(SELECT 1 FROM public.invoices WHERE order_id=oid) THEN RETURN; END IF;
  start_year := extract(year FROM local_at)::integer - CASE WHEN extract(month FROM local_at) < 4 THEN 1 ELSE 0 END;
  series_n := CASE WHEN order_mode='live' THEN start_year::text||'-'||lpad(((start_year+1) % 100)::text,2,'0') ELSE 'TEST' END;
  -- One number at a time per series, so two payments landing together never share a number.
  PERFORM pg_advisory_xact_lock(hashtext('detoxleaf_invoice_'||series_n));
  SELECT coalesce(max(seq),0)+1 INTO next_seq FROM public.invoices WHERE series=series_n;
  INSERT INTO public.invoices(order_id, invoice_number, series, seq, issued_at)
  VALUES (oid, 'DL/'||series_n||'/'||lpad(next_seq::text,4,'0'), series_n, next_seq, at)
  ON CONFLICT (order_id) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION detoxleaf_private.issue_invoice(uuid,text,timestamptz) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION detoxleaf_private.invoice_on_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.payment_status IN ('paid','cod') AND (TG_OP='INSERT' OR OLD.payment_status IS DISTINCT FROM NEW.payment_status) THEN
    PERFORM detoxleaf_private.issue_invoice(NEW.id, NEW.mode, now());
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION detoxleaf_private.invoice_on_payment() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS invoice_on_payment ON public.orders;
CREATE TRIGGER invoice_on_payment AFTER INSERT OR UPDATE OF payment_status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION detoxleaf_private.invoice_on_payment();

-- Orders already paid (or later refunded) and open cash-on-delivery orders get numbers in the order they were placed.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id, mode, created_at FROM public.orders
           WHERE (payment_status IN ('paid','partially_refunded','refunded') OR (payment_status='cod' AND status<>'cancelled'))
             AND NOT EXISTS(SELECT 1 FROM public.invoices i WHERE i.order_id=orders.id)
           ORDER BY created_at
  LOOP
    PERFORM detoxleaf_private.issue_invoice(r.id, r.mode, r.created_at);
  END LOOP;
END $$;
