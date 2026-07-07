
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS banned boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.marketing_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  barbershop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE,
  title text,
  media_type text NOT NULL CHECK (media_type IN ('image','video','youtube')),
  media_url text NOT NULL,
  link_url text,
  duration_seconds integer DEFAULT 8,
  sort_order integer DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.marketing_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_media TO authenticated;
GRANT ALL ON public.marketing_media TO service_role;

ALTER TABLE public.marketing_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active marketing media"
  ON public.marketing_media FOR SELECT
  USING (active = true);

CREATE POLICY "Owner can manage own marketing media"
  ON public.marketing_media FOR ALL
  USING (auth.uid() = owner_id OR public.get_account_owner(auth.uid()) = owner_id OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (auth.uid() = owner_id OR public.get_account_owner(auth.uid()) = owner_id OR public.has_role(auth.uid(), 'superadmin'));

CREATE TRIGGER trg_marketing_media_updated
  BEFORE UPDATE ON public.marketing_media
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Superadmin can view all barbershops"
  ON public.barbershops FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmin can update all barbershops"
  ON public.barbershops FOR UPDATE
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmin can delete barbershops"
  ON public.barbershops FOR DELETE
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Public can view barbers for TV"
  ON public.barbers FOR SELECT
  USING (active = true AND EXISTS (
    SELECT 1 FROM public.barbershops b
    WHERE b.id = barbers.barbershop_id AND b.active = true AND b.banned = false
  ));

CREATE POLICY "Public can view today's appointments for TV"
  ON public.appointments FOR SELECT
  USING (appointment_date = CURRENT_DATE AND EXISTS (
    SELECT 1 FROM public.barbershops b
    WHERE b.id = appointments.barbershop_id AND b.active = true AND b.banned = false
  ));
