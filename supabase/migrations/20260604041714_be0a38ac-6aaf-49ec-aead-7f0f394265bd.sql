ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check CHECK (status = ANY (ARRAY['ativo'::text, 'pendente'::text, 'a_pagar'::text, 'cancelando'::text, 'cancelado'::text, 'vencido'::text]));

CREATE OR REPLACE FUNCTION public.get_account_owner(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT ur.created_by FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.created_by IS NOT NULL LIMIT 1),
    _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_account_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = 'admin'::app_role
      AND (ur.created_by = _user_id OR ur.created_by IS NULL)
  )
$$;

DROP POLICY IF EXISTS "Staff view appointments for owned account" ON public.appointments;
CREATE POLICY "Staff view appointments for owned account"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND owner_id = public.get_account_owner(auth.uid())
);

DROP POLICY IF EXISTS "Staff update appointments for owned account" ON public.appointments;
CREATE POLICY "Staff update appointments for owned account"
ON public.appointments
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

DROP POLICY IF EXISTS "Staff delete appointments for owned account" ON public.appointments;
CREATE POLICY "Staff delete appointments for owned account"
ON public.appointments
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND owner_id = public.get_account_owner(auth.uid())
);

DROP POLICY IF EXISTS "Staff insert appointments for owned account" ON public.appointments;
CREATE POLICY "Staff insert appointments for owned account"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND owner_id = public.get_account_owner(auth.uid())
);

DROP POLICY IF EXISTS "Staff view own account plans" ON public.plans;
CREATE POLICY "Staff view own account plans"
ON public.plans
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND owner_id = public.get_account_owner(auth.uid())
);

DROP POLICY IF EXISTS "Staff manage own account services" ON public.services;
CREATE POLICY "Staff manage own account services"
ON public.services
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

DROP POLICY IF EXISTS "Staff manage own account barbers" ON public.barbers;
CREATE POLICY "Staff manage own account barbers"
ON public.barbers
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

DROP POLICY IF EXISTS "Staff view own account subscriptions" ON public.subscriptions;
CREATE POLICY "Staff view own account subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.plans p
    WHERE p.id = subscriptions.plan_id
      AND p.owner_id = public.get_account_owner(auth.uid())
  )
);

DROP POLICY IF EXISTS "Staff update own account subscriptions" ON public.subscriptions;
CREATE POLICY "Staff update own account subscriptions"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.plans p
    WHERE p.id = subscriptions.plan_id
      AND p.owner_id = public.get_account_owner(auth.uid())
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.plans p
    WHERE p.id = subscriptions.plan_id
      AND p.owner_id = public.get_account_owner(auth.uid())
  )
);

DROP POLICY IF EXISTS "Staff view own account transactions" ON public.transactions;
CREATE POLICY "Staff view own account transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND owner_id = public.get_account_owner(auth.uid())
);

DROP POLICY IF EXISTS "Staff insert own account transactions" ON public.transactions;
CREATE POLICY "Staff insert own account transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND owner_id = public.get_account_owner(auth.uid())
);

DROP POLICY IF EXISTS "Staff update own account transactions" ON public.transactions;
CREATE POLICY "Staff update own account transactions"
ON public.transactions
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

DROP POLICY IF EXISTS "Staff delete own account transactions" ON public.transactions;
CREATE POLICY "Staff delete own account transactions"
ON public.transactions
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND owner_id = public.get_account_owner(auth.uid())
);

DROP POLICY IF EXISTS "Staff view own account barbershop" ON public.barbershops;
CREATE POLICY "Staff view own account barbershop"
ON public.barbershops
FOR SELECT
TO authenticated
USING (
  owner_id = public.get_account_owner(auth.uid())
);

DROP POLICY IF EXISTS "Owners manage created roles" ON public.user_roles;
CREATE POLICY "Owners manage created roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.is_account_owner(auth.uid())
  AND created_by = public.get_account_owner(auth.uid())
)
WITH CHECK (
  public.is_account_owner(auth.uid())
  AND created_by = public.get_account_owner(auth.uid())
);

DROP POLICY IF EXISTS "Owners view created profiles" ON public.profiles;
CREATE POLICY "Owners view created profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.is_account_owner(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = profiles.user_id
      AND ur.created_by = public.get_account_owner(auth.uid())
  )
);