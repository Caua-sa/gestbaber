
-- Barbers
CREATE TABLE public.barbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  barbershop_id UUID,
  name TEXT NOT NULL,
  commission_pct NUMERIC NOT NULL DEFAULT 0 CHECK (commission_pct >= 0 AND commission_pct <= 100),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view active barbers" ON public.barbers
  FOR SELECT USING (active = true);

CREATE POLICY "Admins view own barbers" ON public.barbers
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

CREATE POLICY "Admins insert own barbers" ON public.barbers
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

CREATE POLICY "Admins update own barbers" ON public.barbers
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

CREATE POLICY "Admins delete own barbers" ON public.barbers
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

CREATE TRIGGER trg_barbers_updated
BEFORE UPDATE ON public.barbers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Services
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  barbershop_id UUID,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  duration_min INTEGER NOT NULL DEFAULT 30,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view active services" ON public.services
  FOR SELECT USING (active = true);

CREATE POLICY "Admins view own services" ON public.services
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

CREATE POLICY "Admins insert own services" ON public.services
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

CREATE POLICY "Admins update own services" ON public.services
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

CREATE POLICY "Admins delete own services" ON public.services
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

CREATE TRIGGER trg_services_updated
BEFORE UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Appointment price
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS price NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS barber_id UUID;
