DROP POLICY IF EXISTS "Staff manage own account products" ON public.products;
CREATE POLICY "Staff manage own account products"
ON public.products
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND owner_id = public.get_account_owner(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND owner_id = public.get_account_owner(auth.uid())
);

DROP POLICY IF EXISTS "Staff manage own account insumos" ON public.insumos;
CREATE POLICY "Staff manage own account insumos"
ON public.insumos
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND owner_id = public.get_account_owner(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND owner_id = public.get_account_owner(auth.uid())
);

DROP POLICY IF EXISTS "Staff view own account orders" ON public.orders;
CREATE POLICY "Staff view own account orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND owner_id = public.get_account_owner(auth.uid())
);

DROP POLICY IF EXISTS "Staff update own account orders" ON public.orders;
CREATE POLICY "Staff update own account orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND owner_id = public.get_account_owner(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND owner_id = public.get_account_owner(auth.uid())
);