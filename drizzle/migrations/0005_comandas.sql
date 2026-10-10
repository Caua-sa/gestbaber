CREATE TABLE public.comandas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  customer_name text NOT NULL,
  status text NOT NULL DEFAULT 'aberta',
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
CREATE TABLE public.comanda_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id uuid NOT NULL REFERENCES public.comandas(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  product_id uuid,
  name text NOT NULL,
  unit_price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comandas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comanda_items TO authenticated;
GRANT ALL ON public.comandas TO service_role;
GRANT ALL ON public.comanda_items TO service_role;
ALTER TABLE public.comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comanda_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Account manages comandas" ON public.comandas FOR ALL TO authenticated
  USING (owner_id = public.get_account_owner(auth.uid())) WITH CHECK (owner_id = public.get_account_owner(auth.uid()));
CREATE POLICY "Account manages comanda items" ON public.comanda_items FOR ALL TO authenticated
  USING (owner_id = public.get_account_owner(auth.uid())) WITH CHECK (owner_id = public.get_account_owner(auth.uid()));