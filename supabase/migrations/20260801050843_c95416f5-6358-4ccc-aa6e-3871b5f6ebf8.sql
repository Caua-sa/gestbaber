-- 1) Appointments: remove broad public SELECT, expose a minimal TV view
DROP POLICY IF EXISTS "Public can view today's appointments for TV" ON public.appointments;

CREATE OR REPLACE VIEW public.tv_agenda_slots
WITH (security_invoker = false) AS
SELECT a.barbershop_id, a.barber_id, a.appointment_time, a.status, a.appointment_date
FROM public.appointments a
JOIN public.barbershops b ON b.id = a.barbershop_id
WHERE a.appointment_date = CURRENT_DATE
  AND b.active = true
  AND b.banned = false;

GRANT SELECT ON public.tv_agenda_slots TO anon, authenticated;

-- 2) user_roles: prevent privilege escalation to superadmin
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Owners manage created roles" ON public.user_roles;

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert non-superadmin roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND (role <> 'superadmin'::app_role OR has_role(auth.uid(), 'superadmin'::app_role))
);

CREATE POLICY "Admins update non-superadmin roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND (role <> 'superadmin'::app_role OR has_role(auth.uid(), 'superadmin'::app_role))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND (role <> 'superadmin'::app_role OR has_role(auth.uid(), 'superadmin'::app_role))
);

CREATE POLICY "Admins delete non-superadmin roles"
ON public.user_roles FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND (role <> 'superadmin'::app_role OR has_role(auth.uid(), 'superadmin'::app_role))
);

CREATE POLICY "Owners manage created roles"
ON public.user_roles FOR ALL TO authenticated
USING (
  is_account_owner(auth.uid())
  AND created_by = get_account_owner(auth.uid())
  AND (role <> 'superadmin'::app_role OR has_role(auth.uid(), 'superadmin'::app_role))
)
WITH CHECK (
  is_account_owner(auth.uid())
  AND created_by = get_account_owner(auth.uid())
  AND (role <> 'superadmin'::app_role OR has_role(auth.uid(), 'superadmin'::app_role))
);

-- 3) Storage: stop bucket listing (public bucket URLs still work)
DROP POLICY IF EXISTS "Public read barbershop logos" ON storage.objects;

CREATE POLICY "Owners read barbershop logos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'barbershop-logos' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 4) Lock down SECURITY DEFINER functions not needed by clients
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_subscription_expiry() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_account_owner(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_account_owner(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_birthday_today(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_account_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_account_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_birthday_today(uuid) TO authenticated;