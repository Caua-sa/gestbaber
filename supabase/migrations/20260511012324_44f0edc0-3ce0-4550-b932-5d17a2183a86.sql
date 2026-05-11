-- Track which admin created each user role
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE INDEX IF NOT EXISTS idx_user_roles_created_by ON public.user_roles(created_by);

-- Allow admins to insert appointments for their own barbershop
DROP POLICY IF EXISTS "Admins insert own appointments" ON public.appointments;
CREATE POLICY "Admins insert own appointments"
ON public.appointments
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND owner_id = auth.uid());