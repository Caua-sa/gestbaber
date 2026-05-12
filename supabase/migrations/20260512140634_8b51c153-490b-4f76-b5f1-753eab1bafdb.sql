-- Allow admins to view appointments for barbershops they own, even when owner_id is missing or stale
CREATE POLICY "Admins view appointments for owned barbershops"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.barbershops b
    WHERE b.id = appointments.barbershop_id
      AND b.owner_id = auth.uid()
  )
);

-- Allow admins to update appointments for barbershops they own
CREATE POLICY "Admins update appointments for owned barbershops"
ON public.appointments
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.barbershops b
    WHERE b.id = appointments.barbershop_id
      AND b.owner_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.barbershops b
    WHERE b.id = appointments.barbershop_id
      AND b.owner_id = auth.uid()
  )
);

-- Allow admins to delete appointments for barbershops they own
CREATE POLICY "Admins delete appointments for owned barbershops"
ON public.appointments
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1
    FROM public.barbershops b
    WHERE b.id = appointments.barbershop_id
      AND b.owner_id = auth.uid()
  )
);

-- Repair recently misrouted client appointments by matching the client's creator to that creator's active barbershop
UPDATE public.appointments a
SET
  barbershop_id = b.id,
  owner_id = b.owner_id
FROM public.user_roles ur
JOIN public.barbershops b
  ON b.owner_id = ur.created_by
 AND b.active = true
WHERE ur.user_id = a.user_id
  AND ur.created_by IS NOT NULL
  AND (a.barbershop_id IS DISTINCT FROM b.id OR a.owner_id IS DISTINCT FROM b.owner_id);

-- Repair appointments made by admin accounts by matching them to that admin's own active barbershop
UPDATE public.appointments a
SET
  barbershop_id = b.id,
  owner_id = b.owner_id
FROM public.barbershops b
WHERE b.owner_id = a.user_id
  AND b.active = true
  AND (a.barbershop_id IS DISTINCT FROM b.id OR a.owner_id IS DISTINCT FROM b.owner_id);