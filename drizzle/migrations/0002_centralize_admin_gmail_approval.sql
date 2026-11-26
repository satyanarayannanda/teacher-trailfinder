CREATE TABLE public.admin_email_allowlist (
  email text PRIMARY KEY,
  CONSTRAINT approved_gmail_format CHECK (email = lower(btrim(email)) AND email ~ '^[a-z0-9][a-z0-9._+%-]*@gmail\.com$')
);
GRANT ALL ON public.admin_email_allowlist TO service_role;
ALTER TABLE public.admin_email_allowlist ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.admin_email_allowlist IS 'Central owner-approved Gmail configuration. Manage via privileged Cloud tools, never browser writes.';
INSERT INTO public.admin_email_allowlist (email)
SELECT lower(u.email) FROM auth.users u JOIN public.user_roles r ON r.user_id = u.id
WHERE r.role = 'admin' AND lower(u.email) IN ('satyanarayannanda09@gmail.com', 'samarthsharma1337@gmail.com');

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles r
    JOIN auth.users u ON u.id = r.user_id
    JOIN public.admin_email_allowlist a ON a.email = lower(u.email)
    WHERE r.user_id = _user_id AND r.role = _role
      AND u.email_confirmed_at IS NOT NULL
      AND lower(split_part(u.email, '@', 2)) = 'gmail.com'
  );
$$;

CREATE OR REPLACE FUNCTION public.sync_admin_email_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('DELETE', 'UPDATE') THEN
    DELETE FROM public.user_roles r USING auth.users u
    WHERE r.user_id = u.id AND r.role = 'admin' AND lower(u.email) = OLD.email;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT u.id, 'admin'::public.app_role FROM auth.users u
    WHERE lower(u.email) = NEW.email AND u.email_confirmed_at IS NOT NULL
    ON CONFLICT (user_id, role) DO NOTHING;
    RETURN NEW;
  END IF;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_admin_email_approval() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER admin_email_approval_changed
AFTER INSERT OR UPDATE OR DELETE ON public.admin_email_allowlist
FOR EACH ROW EXECUTE FUNCTION public.sync_admin_email_approval();

CREATE OR REPLACE FUNCTION public.sync_approved_admin_account()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.admin_email_allowlist WHERE email = lower(NEW.email)
  ) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = NEW.id AND role = 'admin';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_approved_admin_account() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER approved_admin_account_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_approved_admin_account();
CREATE TRIGGER approved_admin_account_updated AFTER UPDATE OF email, email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_approved_admin_account();