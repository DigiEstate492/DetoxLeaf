import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {readFileSync} from 'node:fs';
import {amountDue,amountInWords,invoiceReady,invoiceTitle,sellerDetails,stateFromPin,taxLines} from './lib/invoice.mjs';
import {renderEmail} from './lib/email-templates.mjs';

// Helpers
assert.equal(amountInWords(54000),'Rupees Five Hundred Forty Only');
assert.equal(amountInWords(850000),'Rupees Eight Thousand Five Hundred Only');
assert.equal(amountInWords(12345678),'Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six and Seventy Eight Paise Only');
assert.equal(amountInWords(0),'Rupees Zero Only');
assert.equal(stateFromPin('110017'),'Delhi');assert.equal(stateFromPin('122001'),'Haryana');assert.equal(stateFromPin('201301'),'Uttar Pradesh');assert.equal(stateFromPin('12'),'');
const seller=sellerDetails({INVOICE_STATE:'Delhi',INVOICE_GSTIN:'07abcde1234f1z5'});assert.equal(seller.gstin,'07ABCDE1234F1Z5');assert.equal(sellerDetails({}).name,'Detoxleaf');
assert.equal(invoiceTitle(sellerDetails({}),{tax_paise:500}),'Invoice');assert.equal(invoiceTitle(seller,{tax_paise:0}),'Bill of Supply');assert.equal(invoiceTitle(seller,{tax_paise:500}),'Tax Invoice');
assert.deepEqual(taxLines(seller,{tax_paise:501,pincode:'110017'}),[['CGST',250],['SGST',251]]);
assert.deepEqual(taxLines(seller,{tax_paise:500,pincode:'122001'}),[['IGST',500]]);
assert.deepEqual(taxLines(sellerDetails({}),{tax_paise:500,pincode:'122001'}),[['GST',500]]);
assert.deepEqual(taxLines(seller,{tax_paise:0,pincode:'110017'}),[]);
assert.ok(invoiceReady({payment_status:'paid'})&&invoiceReady({payment_status:'refunded'})&&invoiceReady({payment_status:'cod'})&&!invoiceReady({payment_status:'pending'})&&!invoiceReady({payment_status:'failed'}));
assert.ok(amountDue({payment_status:'cod',status:'confirmed'})&&!amountDue({payment_status:'cod',status:'cancelled'})&&!amountDue({payment_status:'paid',status:'delivered'}));

// Emails link the invoice only once paid.
const order={id:'00000000-0000-0000-0000-0000000000aa',order_number:'DL-ABC',total_paise:54000,subtotal_paise:50000,discount_paise:0,shipping_paise:4000,tax_paise:0,delivery_date:'2026-11-12',delivery_slot:'4:00–7:00 PM',mode:'live'};
const paidMail=renderEmail('payment_received',{order:{...order,payment_status:'paid'}},'https://www.detoxleaf.in');
assert.match(paidMail.html,/https:\/\/www\.detoxleaf\.in\/account\/orders\/00000000-0000-0000-0000-0000000000aa\/invoice/);assert.match(paidMail.text,/Download your invoice: https:/);
assert.match(renderEmail('order_confirmed',{order:{...order,payment_status:'cod'}},'https://www.detoxleaf.in').html,/\/invoice/);
assert.doesNotMatch(renderEmail('order_confirmed',{order:{...order,payment_status:'pending'}},'https://www.detoxleaf.in').html,/\/invoice/);
assert.doesNotMatch(renderEmail('packed',{order:{...order,payment_status:'paid'}},'https://www.detoxleaf.in').html,/\/invoice/);

// Database: numbering, series, idempotency and access.
const db=new PGlite();await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;`);
for(const f of ['202610160001_initial_commerce.sql','202610210001_live_commerce.sql','202610230001_tray_offers.sql','202610230002_action_emails.sql','202610310001_booking_alerts.sql','202610310002_tray_package_orders.sql'])await db.exec(readFileSync('supabase/migrations/'+f,'utf8'));
const buyer='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002';
await db.exec(`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES('${buyer}','buyer@example.invalid',now()),('${other}','other@example.invalid',now())`);
// A paid order from before the migration is numbered by the backfill.
const insertOrder=(id,mode,status,at,orderStatus='confirmed')=>db.exec(`INSERT INTO public.orders(id,order_number,customer_id,customer_name,email,phone,shipping_address,pincode,delivery_date,delivery_slot,subtotal_paise,total_paise,payment_status,mode,idempotency_key,created_at,status,payment_method) VALUES('${id}','DL-${id.slice(-4)}','${buyer}','Fixture','buyer@example.invalid','9876543210','{"address":"In memory","city":"Delhi"}','110017','2026-11-12','4:00–7:00 PM',50000,50000,'${status}','${mode}','${id}','${at}','${orderStatus}','${status==='cod'?'cod':'razorpay'}')`);
await insertOrder('00000000-0000-0000-0000-00000000a001','live','paid','2026-03-20T10:00:00+05:30');
await insertOrder('00000000-0000-0000-0000-00000000a002','live','pending','2026-11-01T10:00:00+05:30');
await insertOrder('00000000-0000-0000-0000-00000000c001','live','cod','2026-03-25T10:00:00+05:30');
await insertOrder('00000000-0000-0000-0000-00000000c002','live','cod','2026-03-26T10:00:00+05:30','cancelled');
const fy=(()=>{const d=new Date(Date.now()+5.5*3600e3);const y=d.getUTCFullYear()-(d.getUTCMonth()<3?1:0);return y+'-'+String((y+1)%100).padStart(2,'0');})();
const migration=readFileSync('supabase/migrations/202611100001_invoices.sql','utf8');await db.exec(migration);await db.exec(migration);
const numbers=async()=>(await db.query('select order_id,invoice_number from public.invoices order by series,seq')).rows;
assert.deepEqual((await numbers()).map(r=>r.invoice_number),['DL/2025-26/0001','DL/2025-26/0002']);
// Paying later issues the next number in the current financial year; re-saving the status does not issue another.
await db.exec(`UPDATE public.orders SET payment_status='paid' WHERE id='00000000-0000-0000-0000-00000000a002'`);
await db.exec(`UPDATE public.orders SET payment_status='paid' WHERE id='00000000-0000-0000-0000-00000000a002'`);
await insertOrder('00000000-0000-0000-0000-00000000a003','live','paid','2026-11-02T10:00:00+05:30');
await insertOrder('00000000-0000-0000-0000-00000000a004','test','paid','2026-11-02T10:00:00+05:30');
await insertOrder('00000000-0000-0000-0000-00000000a005','live','pending','2026-11-02T10:00:00+05:30');
await insertOrder('00000000-0000-0000-0000-00000000c003','live','cod','2026-11-03T10:00:00+05:30');
const codNumber=(await db.query(`select invoice_number from public.invoices where order_id='00000000-0000-0000-0000-00000000c003'`)).rows[0]?.invoice_number;assert.equal(codNumber,`DL/${fy}/0003`,'COD order is invoiced when placed');
await db.exec(`UPDATE public.orders SET payment_status='paid',status='delivered' WHERE id='00000000-0000-0000-0000-00000000c003'`);
assert.equal((await db.query(`select invoice_number from public.invoices where order_id='00000000-0000-0000-0000-00000000c003'`)).rows[0].invoice_number,codNumber,'collecting cash keeps the number');
assert.deepEqual((await numbers()).map(r=>r.invoice_number).sort(),['DL/2025-26/0001','DL/2025-26/0002',`DL/${fy}/0001`,`DL/${fy}/0002`,`DL/${fy}/0003`,'DL/TEST/0001'].sort());
assert.equal((await numbers()).length,6,'unpaid and cancelled-COD orders get no invoice');
// Refunds keep the invoice.
await db.exec(`UPDATE public.orders SET payment_status='refunded' WHERE id='00000000-0000-0000-0000-00000000a003'`);assert.equal((await numbers()).length,6);
// Customers see only their own invoices and cannot create one.
await db.exec(`SET ROLE authenticated;SET request.jwt.claim.sub='${buyer}';`);assert.equal((await db.query('select * from public.invoices')).rows.length,6);
await assert.rejects(db.exec(`INSERT INTO public.invoices(order_id,invoice_number,series,seq) VALUES('00000000-0000-0000-0000-00000000a005','DL/X/1','X',1)`));
await assert.rejects(db.exec(`SELECT detoxleaf_private.issue_invoice('00000000-0000-0000-0000-00000000a005','live',now())`));
await db.exec(`RESET ROLE;SET ROLE authenticated;SET request.jwt.claim.sub='${other}';`);assert.equal((await db.query('select * from public.invoices')).rows.length,0);
console.log('Invoice tests passed.');
