
-- 1. profiles: birthday + email
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. barbershops: birthday discount
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS birthday_discount_percent INTEGER NOT NULL DEFAULT 10;

-- 3. subscriptions: allow 'pago' status
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('ativo','cancelado','expirado','pendente','a_pagar','pago'));

-- 4. helper
CREATE OR REPLACE FUNCTION public.has_birthday_today(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND birthday IS NOT NULL
      AND EXTRACT(MONTH FROM birthday) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(DAY FROM birthday) = EXTRACT(DAY FROM CURRENT_DATE)
  )
$$;

-- 5. whatsapp_settings
CREATE TABLE IF NOT EXISTS public.whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL UNIQUE,
  phone_number_id TEXT,
  access_token TEXT,
  business_account_id TEXT,
  display_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_settings TO authenticated;
GRANT ALL ON public.whatsapp_settings TO service_role;

ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages whatsapp_settings"
ON public.whatsapp_settings FOR ALL TO authenticated
USING (owner_id = public.get_account_owner(auth.uid()))
WITH CHECK (owner_id = public.get_account_owner(auth.uid()));

CREATE TRIGGER trg_whatsapp_settings_updated
BEFORE UPDATE ON public.whatsapp_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
