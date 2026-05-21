DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;

CREATE POLICY "Admins view own barbershop subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND (
    EXISTS (
      SELECT 1 FROM public.barbershops b
      WHERE b.id = subscriptions.barbershop_id
        AND b.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = subscriptions.plan_id
        AND p.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins insert own barbershop subscriptions"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.plans p
    WHERE p.id = subscriptions.plan_id
      AND p.owner_id = auth.uid()
      AND (subscriptions.barbershop_id IS NULL OR subscriptions.barbershop_id = p.barbershop_id)
  )
);

CREATE POLICY "Admins update own barbershop subscriptions"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND (
    EXISTS (
      SELECT 1 FROM public.barbershops b
      WHERE b.id = subscriptions.barbershop_id
        AND b.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = subscriptions.plan_id
        AND p.owner_id = auth.uid()
    )
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1 FROM public.plans p
    WHERE p.id = subscriptions.plan_id
      AND p.owner_id = auth.uid()
      AND (subscriptions.barbershop_id IS NULL OR subscriptions.barbershop_id = p.barbershop_id)
  )
);

CREATE POLICY "Admins delete own barbershop subscriptions"
ON public.subscriptions
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND (
    EXISTS (
      SELECT 1 FROM public.barbershops b
      WHERE b.id = subscriptions.barbershop_id
        AND b.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.plans p
      WHERE p.id = subscriptions.plan_id
        AND p.owner_id = auth.uid()
    )
  )
);