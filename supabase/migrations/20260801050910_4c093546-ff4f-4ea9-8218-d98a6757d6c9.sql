DROP VIEW IF EXISTS public.tv_agenda_slots;

CREATE VIEW public.tv_agenda_slots
WITH (security_invoker = true) AS
SELECT a.barbershop_id, a.barber_id, a.appointment_time, a.status, a.appointment_date
FROM public.appointments a
WHERE a.appointment_date = CURRENT_DATE;

GRANT SELECT ON public.tv_agenda_slots TO anon, authenticated;

CREATE POLICY "Public can view today's TV slots"
ON public.appointments FOR SELECT TO anon
USING (
  appointment_date = CURRENT_DATE
  AND EXISTS (
    SELECT 1 FROM public.barbershops b
    WHERE b.id = appointments.barbershop_id AND b.active = true AND b.banned = false
  )
);

-- Column-level restriction: anon may only read non-sensitive columns
REVOKE SELECT ON public.appointments FROM anon;
GRANT SELECT (barbershop_id, barber_id, appointment_time, status, appointment_date) ON public.appointments TO anon;