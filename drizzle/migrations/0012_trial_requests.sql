CREATE TABLE public.trial_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  barbershop_name text NOT NULL,
  phone text NOT NULL,
  email text,
  city text,
  status text NOT NULL DEFAULT 'novo',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.trial_requests TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.trial_requests TO authenticated;
GRANT ALL ON public.trial_requests TO service_role;
ALTER TABLE public.trial_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can request trial" ON public.trial_requests FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'novo' AND length(name) BETWEEN 1 AND 120 AND length(barbershop_name) BETWEEN 1 AND 120 AND length(phone) BETWEEN 8 AND 30);
CREATE POLICY "Superadmin reads trials" ON public.trial_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Superadmin updates trials" ON public.trial_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Superadmin deletes trials" ON public.trial_requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));