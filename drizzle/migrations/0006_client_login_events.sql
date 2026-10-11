CREATE TABLE public.client_login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  method text NOT NULL CHECK (method IN ('google','whatsapp','perfil')),
  phone text,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.client_login_events TO authenticated;
GRANT ALL ON public.client_login_events TO service_role;
ALTER TABLE public.client_login_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own insert" ON public.client_login_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins read" ON public.client_login_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));