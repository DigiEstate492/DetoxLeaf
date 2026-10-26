-- Apply after 202610230001_tray_offers.sql. Transactional action notifications.
BEGIN;
CREATE OR REPLACE FUNCTION detoxleaf_private.queue_customer_email(uid uuid,kind text,event_key text,data jsonb DEFAULT '{}'::jsonb,oid uuid DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE mode_n text; o public.orders;
BEGIN
 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=uid) OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=uid AND email_confirmed_at IS NOT NULL) THEN RETURN; END IF;
 IF oid IS NOT NULL THEN
 SELECT * INTO o FROM public.orders WHERE id=oid AND customer_id=uid;
 IF NOT FOUND THEN RETURN; END IF;
 mode_n:=o.mode;
 data:=data||jsonb_build_object('order',jsonb_build_object('id',o.id,'order_number',o.order_number,'customer_name',o.customer_name,'subtotal_paise',o.subtotal_paise,'discount_paise',o.discount_paise,'shipping_paise',o.shipping_paise,'tax_paise',o.tax_paise,'total_paise',o.total_paise,'payment_status',o.payment_status,'delivery_date',o.delivery_date,'delivery_slot',o.delivery_slot,'mode',o.mode));
 ELSE
 SELECT coalesce(value->>'payment_mode','test') INTO mode_n FROM public.store_settings WHERE key='checkout';
 END IF;
 INSERT INTO public.notification_jobs(customer_id,order_id,channel,template,payload,idempotency_key)
 VALUES(uid,oid,'email',kind,data||jsonb_build_object('mode',coalesce(mode_n,'test')),event_key)
 ON CONFLICT(idempotency_key) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION detoxleaf_private.queue_customer_email(uuid,text,text,jsonb,uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION detoxleaf_private.queue_email(oid uuid,kind text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid;
BEGIN
 SELECT customer_id INTO uid FROM public.orders WHERE id=oid;
 PERFORM detoxleaf_private.queue_customer_email(uid,kind,kind||'/'||oid,'{}',oid);
END $$;
REVOKE ALL ON FUNCTION detoxleaf_private.queue_email(uuid,text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION detoxleaf_private.action_email_trigger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid; kind text; details jsonb:='{}'; o_id uuid; k text; t public.support_tickets; w public.waitlist; r public.profiles;
BEGIN
 IF TG_TABLE_NAME='order_events' THEN
 IF NEW.status='pending' AND EXISTS(SELECT 1 FROM public.orders WHERE id=NEW.order_id AND payment_method='razorpay') THEN PERFORM detoxleaf_private.queue_email(NEW.order_id,'payment_pending'); END IF;
 RETURN NEW;
 ELSIF TG_TABLE_NAME='orders' THEN
 IF NEW.payment_status='paid' AND OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
 PERFORM detoxleaf_private.queue_email(NEW.id,CASE WHEN NEW.status='cancelled' THEN 'payment_review' ELSE 'payment_received' END);
 END IF; RETURN NEW;
 ELSIF TG_TABLE_NAME='subscriptions' THEN
 uid:=NEW.customer_id;o_id:=NEW.source_order_id;
 IF TG_OP='INSERT' THEN kind:='subscription_started';
 ELSIF NEW.status IS DISTINCT FROM OLD.status THEN kind:=CASE NEW.status WHEN 'paused' THEN 'subscription_paused' WHEN 'active' THEN 'subscription_resumed' WHEN 'cancelled' THEN 'subscription_cancelled' WHEN 'completed' THEN 'subscription_completed' END;
 ELSIF NEW.next_delivery_date IS DISTINCT FROM OLD.next_delivery_date OR NEW.quantity IS DISTINCT FROM OLD.quantity THEN kind:='subscription_updated'; END IF;
 details:=jsonb_build_object('next_delivery_date',NEW.next_delivery_date,'quantity',NEW.quantity,'status',NEW.status,'plan_name',(SELECT name FROM public.subscription_plans WHERE id=NEW.plan_id));k:=NEW.id||'/'||txid_current();
 ELSIF TG_TABLE_NAME='support_tickets' THEN
 uid:=NEW.customer_id;o_id:=NEW.order_id;k:=NEW.id||'/'||txid_current();details:=jsonb_build_object('subject',NEW.subject,'status',NEW.status);
 IF TG_OP='INSERT' THEN kind:='support_received';ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('resolved','closed') THEN kind:='support_resolved';END IF;
 ELSIF TG_TABLE_NAME='support_messages' THEN
 SELECT * INTO t FROM public.support_tickets WHERE id=NEW.ticket_id;
 IF NOT NEW.internal AND NEW.author_id IS DISTINCT FROM t.customer_id THEN uid:=t.customer_id;o_id:=t.order_id;kind:='support_reply';k:=NEW.id::text;details:=jsonb_build_object('subject',t.subject); END IF;
 ELSIF TG_TABLE_NAME='reviews' THEN
 uid:=NEW.customer_id;k:=NEW.id||'/'||NEW.status;SELECT order_id INTO o_id FROM public.order_items WHERE id=NEW.order_item_id;
 IF TG_OP='INSERT' THEN kind:='review_received';ELSIF OLD.status IS DISTINCT FROM NEW.status THEN kind:=CASE NEW.status WHEN 'published' THEN 'review_published' WHEN 'rejected' THEN 'review_rejected' END;END IF;
 ELSIF TG_TABLE_NAME='waitlist' THEN
 IF NEW.consent THEN SELECT id INTO uid FROM auth.users WHERE lower(email)=lower(NEW.email) AND email_confirmed_at IS NOT NULL LIMIT 1;kind:='waitlist_joined';k:=NEW.id::text;details:=jsonb_build_object('pincode',NEW.pincode); END IF;
 ELSIF TG_TABLE_NAME='service_areas' THEN
 IF NEW.active AND NOT OLD.active THEN
 FOR w IN SELECT * FROM public.waitlist WHERE pincode=NEW.pincode AND consent LOOP
 SELECT id INTO uid FROM auth.users WHERE lower(email)=lower(w.email) AND email_confirmed_at IS NOT NULL LIMIT 1;
 PERFORM detoxleaf_private.queue_customer_email(uid,'delivery_available','delivery_available/'||w.id,jsonb_build_object('pincode',NEW.pincode));
 END LOOP;
 END IF;RETURN NEW;
 ELSIF TG_TABLE_NAME='profiles' THEN
 IF NEW.full_name IS DISTINCT FROM OLD.full_name OR NEW.phone IS DISTINCT FROM OLD.phone THEN uid:=NEW.id;kind:='profile_updated';k:=NEW.id||'/'||txid_current(); END IF;
 ELSIF TG_TABLE_NAME='addresses' THEN
 IF TG_OP='DELETE' THEN uid:=OLD.customer_id;k:=OLD.id||'/'||txid_current();kind:='address_removed';
 ELSE uid:=NEW.customer_id;k:=NEW.id||'/'||txid_current();IF TG_OP='INSERT' THEN kind:='address_added';ELSIF to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD) THEN kind:='address_updated';END IF; END IF;
 ELSIF TG_TABLE_NAME='reward_ledger' THEN
 uid:=NEW.customer_id;o_id:=NEW.order_id;kind:='rewards_updated';k:=NEW.id::text;details:=jsonb_build_object('points',NEW.points,'reason',NEW.reason);
 ELSIF TG_TABLE_NAME='staff_members' THEN
 IF TG_OP='INSERT' THEN kind:='team_access_updated';ELSIF NEW.role IS DISTINCT FROM OLD.role OR NEW.active IS DISTINCT FROM OLD.active THEN kind:='team_access_updated';END IF;
 uid:=NEW.user_id;k:=NEW.user_id||'/'||txid_current();details:=jsonb_build_object('role',NEW.role,'access',CASE WHEN NEW.active THEN 'Active' ELSE 'Inactive' END);
 END IF;
 IF kind IS NOT NULL AND uid IS NOT NULL THEN PERFORM detoxleaf_private.queue_customer_email(uid,kind,kind||'/'||k,details,o_id);END IF;
 IF TG_OP='DELETE' THEN RETURN OLD;END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION detoxleaf_private.action_email_trigger() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE table_n text; events text;BEGIN
 FOR table_n IN SELECT unnest(ARRAY['order_events','orders','subscriptions','support_tickets','support_messages','reviews','waitlist','service_areas','profiles','addresses','reward_ledger','staff_members']) LOOP
 events:=CASE WHEN table_n IN ('orders','service_areas','profiles') THEN 'UPDATE' WHEN table_n='addresses' THEN 'INSERT OR UPDATE OR DELETE' WHEN table_n IN ('subscriptions','support_tickets','reviews','staff_members') THEN 'INSERT OR UPDATE' ELSE 'INSERT' END;
 EXECUTE format('DROP TRIGGER IF EXISTS dl_action_email ON public.%I',table_n);
 EXECUTE format('CREATE TRIGGER dl_action_email AFTER %s ON public.%I FOR EACH ROW EXECUTE FUNCTION detoxleaf_private.action_email_trigger()',events,table_n);
 END LOOP;
END $$;
COMMIT;
