
-- 1) Conveniência: flag de visibilidade no site
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS visible_on_site BOOLEAN NOT NULL DEFAULT true;

-- 2) Tabela de Insumos (separada de produtos, nunca aparece no site)
CREATE TABLE IF NOT EXISTS public.insumos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'un',
  stock NUMERIC NOT NULL DEFAULT 0,
  min_stock NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  supplier TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.insumos TO authenticated;
GRANT ALL ON public.insumos TO service_role;

ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view own insumos" ON public.insumos
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

CREATE POLICY "Admins insert own insumos" ON public.insumos
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

CREATE POLICY "Admins update own insumos" ON public.insumos
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

CREATE POLICY "Admins delete own insumos" ON public.insumos
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());

CREATE TRIGGER update_insumos_updated_at
BEFORE UPDATE ON public.insumos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Planos recorrentes do Mercado Pago
CREATE TABLE IF NOT EXISTS public.mp_recurring_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  plan_id UUID,
  mp_preapproval_plan_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  frequency INTEGER NOT NULL DEFAULT 1,
  frequency_type TEXT NOT NULL DEFAULT 'months',
  currency_id TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'active',
  init_point TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mp_recurring_plans TO authenticated;
GRANT ALL ON public.mp_recurring_plans TO service_role;

ALTER TABLE public.mp_recurring_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage own mp_recurring_plans" ON public.mp_recurring_plans
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND admin_user_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND admin_user_id = auth.uid());

CREATE TRIGGER update_mp_recurring_plans_updated_at
BEFORE UPDATE ON public.mp_recurring_plans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
