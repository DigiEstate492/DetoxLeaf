-- Apply after 202610230002_action_emails.sql. New schedule alerts for the owner and opted-in customers.
BEGIN;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_opt_in boolean NOT NULL DEFAULT false;
GRANT UPDATE(whatsapp_opt_in) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION detoxleaf_private.booking_alert_trigger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.orders; details jsonb;
BEGIN
 IF NEW.source_order_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO o FROM public.orders WHERE id=NEW.source_order_id;
 IF NOT FOUND THEN RETURN NEW; END IF;
 -- Contact details stay on the order and are read at send time.
 details:=jsonb_build_object('next_delivery_date',NEW.next_delivery_date,'quantity',NEW.quantity,'interval_days',NEW.interval_days,'plan_name',(SELECT name FROM public.subscription_plans WHERE id=NEW.plan_id),'mode',o.mode);
 INSERT INTO public.notification_jobs(customer_id,order_id,channel,template,payload,idempotency_key) VALUES
 (NEW.customer_id,o.id,'email','owner_new_booking',details,'owner_new_booking/email/'||NEW.id),
 (NEW.customer_id,o.id,'whatsapp','owner_new_booking',details,'owner_new_booking/whatsapp/'||NEW.id)
 ON CONFLICT(idempotency_key) DO NOTHING;
 IF EXISTS(SELECT 1 FROM public.profiles WHERE id=NEW.customer_id AND whatsapp_opt_in) THEN
 INSERT INTO public.notification_jobs(customer_id,order_id,channel,template,payload,idempotency_key)
 VALUES(NEW.customer_id,o.id,'whatsapp','subscription_started',details,'subscription_started/whatsapp/'||NEW.id)
 ON CONFLICT(idempotency_key) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION detoxleaf_private.booking_alert_trigger() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS dl_booking_alerts ON public.subscriptions;
CREATE TRIGGER dl_booking_alerts AFTER INSERT ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION detoxleaf_private.booking_alert_trigger();

CREATE OR REPLACE FUNCTION public.dl_claim_whatsapp() RETURNS SETOF public.notification_jobs LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 UPDATE public.notification_jobs SET status='processing',attempts=attempts+1,lease_at=now()
 WHERE id IN (SELECT id FROM public.notification_jobs WHERE channel='whatsapp' AND attempts<5 AND scheduled_at<=now() AND created_at>now()-interval '23 hours' AND (status IN ('pending','failed') OR (status='processing' AND lease_at<now()-interval '5 minutes')) ORDER BY scheduled_at FOR UPDATE SKIP LOCKED LIMIT 10) RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.dl_claim_whatsapp() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dl_claim_whatsapp() TO service_role;
COMMIT;
