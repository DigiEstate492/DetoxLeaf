-- Apply after 202610310002_tray_package_orders.sql. Opens Delhi NCR delivery. PINs verified against India Post data on 2026-10-31.
-- Rerun any time to open another 14 days. 122001 is left as already configured.
-- A single DO block, so it stays atomic in the Supabase SQL Editor.
DO $$
DECLARE r record;
BEGIN
 FOR r IN SELECT * FROM (VALUES
 ('Delhi',ARRAY['110001','110002','110003','110004','110005','110006','110007','110008','110009','110010','110011','110012','110013','110014','110015','110016','110017','110018','110019','110020','110021','110022','110023','110024','110025','110026','110027','110028','110029','110030','110031','110032','110033','110034','110035','110036','110037','110038','110039','110040','110041','110042','110043','110044','110045','110046','110047','110048','110049','110051','110052','110053','110054','110055','110056','110057','110058','110059','110060','110061','110062','110063','110064','110065','110066','110067','110068','110069','110070','110071','110072','110073','110074','110075','110076','110077','110078','110080','110081','110082','110083','110084','110085','110086','110087','110088','110089','110090','110091','110092','110093','110094','110095','110096','110097']),
 ('Faridabad',ARRAY['121001','121002','121003','121004','121005','121006','121007','121008','121009','121010','121012','121013','121101','121102','121103','121105','121106','121107']),
 ('Gurugram',ARRAY['122002','122003','122004','122005','122006','122007','122008','122009','122010','122011','122015','122016','122017','122018','122051','122052','122101','122102','122103','122104','122105','122107','122108','122413','122414','122503','122504','122505']),
 ('Ghaziabad',ARRAY['201001','201002','201003','201004','201005','201006','201007','201009','201010','201011','201012','201013','201014','201015','201016','201017','201019','201102','201204','201206']),
 ('Noida',ARRAY['201008','201301','201303','201304','201305','201306','201307','201309','201310','201311','201312','201313','201314','203201','203202','203203','203207','203209'])
 ) AS x(city,pins) LOOP
 INSERT INTO public.service_areas(pincode,city,delivery_charge_paise,lead_days,active)
 SELECT p,r.city,4000,1,true FROM unnest(r.pins) AS p
 ON CONFLICT(pincode) DO UPDATE SET city=excluded.city,active=true;
 INSERT INTO public.delivery_slots(pincode,label,starts_at,ends_at,capacity,active)
 SELECT p,'4:00–7:00 PM','16:00'::time,'19:00'::time,5,true FROM unnest(r.pins) AS p
 ON CONFLICT(pincode,label) DO UPDATE SET capacity=excluded.capacity,active=true;
 INSERT INTO public.delivery_calendar(slot_id,delivery_date,capacity)
 SELECT s.id,d::date,5 FROM public.delivery_slots s
 CROSS JOIN generate_series((now() AT TIME ZONE 'Asia/Kolkata')::date+1,(now() AT TIME ZONE 'Asia/Kolkata')::date+14,interval '1 day') AS d
 WHERE s.pincode=ANY(r.pins) AND s.active ON CONFLICT(slot_id,delivery_date) DO NOTHING;
 END LOOP;
END $$;
