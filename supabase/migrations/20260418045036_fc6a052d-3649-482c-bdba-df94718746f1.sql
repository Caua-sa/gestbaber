-- Mercado Pago credentials per admin
CREATE TABLE public.mp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  public_key TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own mp settings"
ON public.mp_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') AND auth.uid() = user_id)
WITH CHECK (public.has_role(auth.uid(), 'admin') AND auth.uid() = user_id);

CREATE TRIGGER mp_settings_updated
BEFORE UPDATE ON public.mp_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Payments tracking
CREATE TABLE public.mp_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  payer_user_id UUID,
  amount NUMERIC NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'pdv', -- pdv | loja | assinatura
  reference_id UUID,
  mp_preference_id TEXT,
  mp_payment_id TEXT,
  init_point TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mp_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all mp payments"
ON public.mp_payments FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own mp payments"
ON public.mp_payments FOR SELECT
TO authenticated
USING (auth.uid() = payer_user_id);

CREATE POLICY "Admins insert mp payments"
ON public.mp_payments FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own mp payments"
ON public.mp_payments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = payer_user_id);

CREATE TRIGGER mp_payments_updated
BEFORE UPDATE ON public.mp_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link transaction to ease reversal (already exists for sales via notes, but a real link helps)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mp_payment_id UUID;