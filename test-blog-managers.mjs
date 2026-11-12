import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {readFileSync} from 'node:fs';
import {slugify,textToParagraphs,paragraphsToText,validateBlogPost,readMinutes} from './lib/blog-editor.mjs';
import {allowedStaff,staffCanOpen,staffRoles} from './lib/auth-policy.mjs';

// Editor helpers
assert.equal(slugify('  Five Ways to Enjoy Wheatgrass — & Mint!  '),'five-ways-to-enjoy-wheatgrass-and-mint');
assert.equal(slugify('Café crème'),'cafe-creme');
assert.deepEqual(textToParagraphs('First line\ncontinues.\n\n\nSecond.\r\n\r\nThird'),['First line continues.','Second.','Third']);
assert.equal(paragraphsToText(['A','B']),'A\n\nB');
assert.equal(readMinutes([{paragraphs:['word '.repeat(450)]}]),2);
assert.match(validateBlogPost({title:'Hi'}).error,/title/);
assert.match(validateBlogPost({title:'Ready to go',status:'published',sections:[{title:'Only a heading',paragraphs:[]}]}).error,/before publishing/);
assert.match(validateBlogPost({title:'Cover check',cover_image:'javascript:alert(1)'}).error,/cover image/);
const ok=validateBlogPost({title:'Morning greens',status:'published',cover_image:'/media/wheatgrass-hero.png',sections:[{title:'Start',text:'One.\n\nTwo.'},{title:'',text:''}],kind:'policy'}).post;
assert.equal(ok.kind,'blog','kind is always blog');assert.equal(ok.slug,'morning-greens');assert.deepEqual(ok.body,{sections:[{title:'Start',paragraphs:['One.','Two.']}]});
assert.equal(validateBlogPost({title:'Status',status:'deleted'}).post.status,'draft');

// Admin access rules
assert.ok(staffRoles.includes('manager')&&allowedStaff({role:'manager',active:true}));
assert.ok(staffCanOpen('manager','/admin/blog'));
for(const path of ['/admin','/admin/orders','/admin/customers','/admin/content','/admin/team','/admin/configuration'])assert.ok(!staffCanOpen('manager',path),path);
assert.ok(staffCanOpen('admin','/admin/blog')&&staffCanOpen('owner','/admin/blog')&&!staffCanOpen('support','/admin/blog'));

// Database
const db=new PGlite();await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;GRANT USAGE ON SCHEMA auth TO anon,authenticated,service_role;GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;`);
for(const f of ['202610160001_initial_commerce.sql','202610210001_live_commerce.sql','202610230001_tray_offers.sql','202610230002_action_emails.sql','202610310001_booking_alerts.sql','202610310002_tray_package_orders.sql','202611100001_invoices.sql'])await db.exec(readFileSync('supabase/migrations/'+f,'utf8'));
const migration=readFileSync('supabase/migrations/202611100002_blog_managers.sql','utf8');await db.exec(migration);await db.exec(migration);
const manager='00000000-0000-0000-0000-0000000000b1',support='00000000-0000-0000-0000-0000000000b2',admin='00000000-0000-0000-0000-0000000000b3',customer='00000000-0000-0000-0000-0000000000b4';
await db.exec(`INSERT INTO auth.users(id,email,email_confirmed_at) VALUES('${manager}','m@example.invalid',now()),('${support}','s@example.invalid',now()),('${admin}','a@example.invalid',now()),('${customer}','c@example.invalid',now());
UPDATE public.profiles SET full_name='Asha Writer' WHERE id='${manager}';
INSERT INTO public.staff_members(user_id,role,active) VALUES('${manager}','manager',true),('${support}','support',true),('${admin}','admin',true);`);
await assert.rejects(db.exec(`INSERT INTO public.staff_members(user_id,role) VALUES('${customer}','editor')`),'unknown roles are still refused');
const as=uid=>db.exec(`RESET ROLE;SET ROLE authenticated;SET request.jwt.claim.sub='${uid}';`);
const post=(slug,extra='')=>`INSERT INTO public.content_pages(slug,title,kind,body,status${extra?',author_name':''}) VALUES('${slug}','Post ${slug}','blog','{"sections":[{"title":"A","paragraphs":["Text"]}]}','published'${extra?`,'${extra}'`:''}) RETURNING id,author_id,author_name,published_at`;

// Manager: full control of blog posts, author recorded from their profile.
await as(manager);
const created=(await db.query(post('manager-post'))).rows[0];
assert.equal(created.author_id,manager);assert.equal(created.author_name,'Asha Writer');assert.ok(created.published_at);
assert.ok((await db.query(`select count(*)::int n from public.content_pages where kind='blog'`)).rows[0].n>=2,'manager reads all blog posts, including seeded ones');
await db.exec(`UPDATE public.content_pages SET title='Edited by manager',status='draft',author_id='${admin}' WHERE id='${created.id}'`);
let row=(await db.query(`select title,status,author_id from public.content_pages where id='${created.id}'`)).rows[0];
assert.equal(row.title,'Edited by manager');assert.equal(row.status,'draft');assert.equal(row.author_id,manager,'author cannot be reassigned');
const seeded=(await db.query(`select id from public.content_pages where slug='meet-your-wheatgrass-tray'`)).rows[0].id;
await db.exec(`UPDATE public.content_pages SET title='Manager edits a seeded post' WHERE id='${seeded}'`);
assert.equal((await db.query(`select title from public.content_pages where id='${seeded}'`)).rows[0].title,'Manager edits a seeded post');
// ...but nothing else.
await assert.rejects(db.exec(`INSERT INTO public.content_pages(slug,title,kind,status) VALUES('sneaky','Sneaky','page','draft')`),'manager cannot create other pages');
await db.exec(`UPDATE public.content_pages SET title='Changed' WHERE kind='policy'`);
assert.equal((await db.query(`select count(*)::int n from public.content_pages where kind='policy' and title='Changed'`)).rows[0].n,0,'manager cannot edit policies');
await assert.rejects(db.exec(`UPDATE public.content_pages SET kind='policy' WHERE id='${created.id}'`),'manager cannot turn a post into a policy');
assert.equal((await db.query('select count(*)::int n from public.orders')).rows[0].n,0);
assert.equal((await db.query('select count(*)::int n from public.profiles')).rows[0].n,1,'manager sees only their own profile');
await assert.rejects(db.query(`select public.dl_report()`),'manager has no sales reports');
await db.exec(`DELETE FROM public.content_pages WHERE id='${created.id}'`);
assert.equal((await db.query(`select count(*)::int n from public.content_pages where id='${created.id}'`)).rows[0].n,0,'manager can delete');

// Support staff and customers cannot write posts.
for(const uid of [support,customer]){await as(uid);await assert.rejects(db.exec(post('nope-'+uid.slice(-2))));}
// Admins keep full control, including a custom byline.
await as(admin);const byAdmin=(await db.query(post('admin-post','Guest Chef'))).rows[0];assert.equal(byAdmin.author_name,'Guest Chef');assert.equal(byAdmin.author_id,admin);
await db.exec(`DELETE FROM public.content_pages WHERE id='${byAdmin.id}'`);

// Every change is in the audit log with who did it.
await db.exec('RESET ROLE');
const audit=(await db.query(`select actor_id,action from public.audit_log where entity_type='content_pages' order by created_at`)).rows;
assert.deepEqual(audit.filter(r=>r.actor_id===manager).map(r=>r.action),['blog_insert','blog_update','blog_update','blog_delete']);
assert.deepEqual(audit.filter(r=>r.actor_id===admin).map(r=>r.action),['blog_insert','blog_delete']);
console.log('Blog manager tests passed.');
