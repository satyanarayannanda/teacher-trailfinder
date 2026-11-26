REVOKE ALL ON TABLE public.admin_email_allowlist FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.admin_email_allowlist TO service_role;