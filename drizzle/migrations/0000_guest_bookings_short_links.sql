CREATE TABLE public.guest_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  service text,
  barber text,
  preferred_date date,
  preferred_time text,
  notes text,
  status text NOT NULL DEFAULT 'novo',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.guest_bookings TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.guest_bookings TO authenticated;
GRANT ALL ON public.guest_bookings TO service_role;
ALTER TABLE public.guest_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can send booking request" ON public.guest_bookings FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'novo' AND length(name) BETWEEN 1 AND 120 AND EXISTS (SELECT 1 FROM public.barbershops b WHERE b.id = barbershop_id AND b.owner_id = guest_bookings.owner_id AND b.active AND NOT b.banned));
CREATE POLICY "Owner reads requests" ON public.guest_bookings FOR SELECT TO authenticated USING (owner_id = public.get_account_owner(auth.uid()));
CREATE POLICY "Owner updates requests" ON public.guest_bookings FOR UPDATE TO authenticated USING (owner_id = public.get_account_owner(auth.uid()));
CREATE POLICY "Owner deletes requests" ON public.guest_bookings FOR DELETE TO authenticated USING (owner_id = public.get_account_owner(auth.uid()));

CREATE TABLE public.short_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  target_url text NOT NULL,
  title text,
  clicks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.short_links TO authenticated;
GRANT ALL ON public.short_links TO service_role;
ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages links" ON public.short_links FOR ALL TO authenticated
  USING (owner_id = public.get_account_owner(auth.uid()))
  WITH CHECK (owner_id = public.get_account_owner(auth.uid()));

CREATE OR REPLACE FUNCTION public.resolve_short_link(_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _url text;
BEGIN
  UPDATE public.short_links SET clicks = clicks + 1 WHERE code = _code RETURNING target_url INTO _url;
  RETURN _url;
END $$;
REVOKE ALL ON FUNCTION public.resolve_short_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_short_link(text) TO anon, authenticated;