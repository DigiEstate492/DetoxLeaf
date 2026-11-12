-- Manager role: managers write, edit, publish and delete blog posts, and nothing else.
-- Owners and admins keep full access. Every post records who wrote it. Safe to run more than once.

-- 1. Allow the new role on team members.
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
           WHERE conrelid='public.staff_members'::regclass AND contype='c' AND pg_get_constraintdef(oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.staff_members DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE public.staff_members ADD CONSTRAINT staff_members_role_check
  CHECK (role IN ('owner','admin','manager','operations','support','viewer'));

-- 2. Blog post details: author, cover photo and last edit time.
ALTER TABLE public.content_pages ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.content_pages ADD COLUMN IF NOT EXISTS author_name text;
ALTER TABLE public.content_pages ADD COLUMN IF NOT EXISTS cover_image text;
ALTER TABLE public.content_pages ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
DO $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='content_pages_cover_image_check') THEN
    ALTER TABLE public.content_pages ADD CONSTRAINT content_pages_cover_image_check
      CHECK (cover_image IS NULL OR cover_image ~ '^(/[A-Za-z0-9._/-]+|https://[^[:space:]"<>]+)$');
  END IF;
END $$;

-- 3. Managers may manage blog posts only. Row-level security enforces this whatever the app sends.
GRANT DELETE ON public.content_pages TO authenticated;
DROP POLICY IF EXISTS manager_blog ON public.content_pages;
CREATE POLICY manager_blog ON public.content_pages FOR ALL TO authenticated
  USING (kind='blog' AND (SELECT detoxleaf_private.is_staff(ARRAY['manager'])))
  WITH CHECK (kind='blog' AND (SELECT detoxleaf_private.is_staff(ARRAY['manager'])));

-- 4. Authorship is set by the database, not the browser: the creator stays the author on later edits.
CREATE OR REPLACE FUNCTION detoxleaf_private.blog_authorship()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    NEW.author_id := coalesce(auth.uid(), NEW.author_id);
    IF NEW.author_id IS NOT NULL AND nullif(trim(coalesce(NEW.author_name,'')),'') IS NULL THEN
      SELECT nullif(trim(full_name),'') INTO NEW.author_name FROM public.profiles WHERE id=NEW.author_id;
    END IF;
  ELSE
    NEW.author_id := OLD.author_id;
  END IF;
  NEW.author_name := left(nullif(trim(coalesce(NEW.author_name,'')),''),80);
  NEW.updated_at := now();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION detoxleaf_private.blog_authorship() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS dl_blog_authorship ON public.content_pages;
CREATE TRIGGER dl_blog_authorship BEFORE INSERT OR UPDATE ON public.content_pages
  FOR EACH ROW EXECUTE FUNCTION detoxleaf_private.blog_authorship();

-- 5. Record who created, changed or deleted each post in the audit log.
CREATE OR REPLACE FUNCTION detoxleaf_private.blog_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r public.content_pages;
BEGIN
  IF TG_OP='DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  IF r.kind='blog' AND auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_log(actor_id,action,entity_type,entity_id,detail)
    VALUES (auth.uid(), 'blog_'||lower(TG_OP), 'content_pages', r.id, jsonb_build_object('title',r.title,'slug',r.slug,'status',r.status));
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION detoxleaf_private.blog_audit() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS dl_blog_audit ON public.content_pages;
CREATE TRIGGER dl_blog_audit AFTER INSERT OR UPDATE OR DELETE ON public.content_pages
  FOR EACH ROW EXECUTE FUNCTION detoxleaf_private.blog_audit();
