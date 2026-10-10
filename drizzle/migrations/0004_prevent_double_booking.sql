CREATE OR REPLACE FUNCTION public.prevent_double_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'cancelado' THEN RETURN NEW; END IF;
  IF EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.id <> NEW.id
      AND a.status <> 'cancelado'
      AND a.appointment_date = NEW.appointment_date
      AND left(a.appointment_time,5) = left(NEW.appointment_time,5)
      AND COALESCE(a.barbershop_id::text, a.owner_id::text) = COALESCE(NEW.barbershop_id::text, NEW.owner_id::text)
      AND (
        (a.barber_id IS NOT NULL AND a.barber_id = NEW.barber_id)
        OR lower(a.barber) = lower(NEW.barber)
      )
  ) THEN
    RAISE EXCEPTION 'Horário já reservado para este barbeiro. Escolha outro horário.';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.prevent_double_booking() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_prevent_double_booking ON public.appointments;
CREATE TRIGGER trg_prevent_double_booking BEFORE INSERT OR UPDATE OF appointment_date, appointment_time, barber, barber_id, status ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.prevent_double_booking();