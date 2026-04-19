-- Barbershops table
CREATE TABLE public.barbershops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active barbershops"
ON public.barbershops FOR SELECT
USING (active = true);

CREATE POLICY "Owners manage own barbershop"
ON public.barbershops FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE TRIGGER barbershops_updated
BEFORE UPDATE ON public.barbershops
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill: create a default barbershop for the original admin
INSERT INTO public.barbershops (owner_id, slug, name, description)
VALUES ('0f83a118-1810-4fab-9979-fa2f013e52a5', 'barber-pro', 'Barber Pro', 'Barbearia padrão')
ON CONFLICT DO NOTHING;

-- Add barbershop_id to plans / appointments / subscriptions
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS barbershop_id UUID;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS barbershop_id UUID;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS barbershop_id UUID;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS cancel_mode TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

-- Backfill barbershop_id with the default barbershop
UPDATE public.plans p
SET barbershop_id = b.id
FROM public.barbershops b
WHERE p.owner_id = b.owner_id AND p.barbershop_id IS NULL;

UPDATE public.appointments a
SET barbershop_id = b.id
FROM public.barbershops b
WHERE a.owner_id = b.owner_id AND a.barbershop_id IS NULL;

-- MP recurring subscriptions
CREATE TABLE public.mp_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  admin_user_id UUID NOT NULL,
  plan_id UUID,
  subscription_id UUID,
  mp_preapproval_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | authorized | paused | cancelled
  amount NUMERIC NOT NULL,
  next_payment_date TIMESTAMPTZ,
  init_point TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mp_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own mp subs"
ON public.mp_subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins view own mp subs"
ON public.mp_subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = admin_user_id);

CREATE POLICY "Users insert own mp subs"
ON public.mp_subscriptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own mp subs"
ON public.mp_subscriptions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER mp_subscriptions_updated
BEFORE UPDATE ON public.mp_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();