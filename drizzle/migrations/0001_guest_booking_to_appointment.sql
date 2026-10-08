CREATE OR REPLACE FUNCTION public.guest_booking_to_appointment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _price numeric := 0; _barber_id uuid;
BEGIN
  SELECT price INTO _price FROM public.services WHERE owner_id = NEW.owner_id AND name = NEW.service AND active LIMIT 1;
  SELECT id INTO _barber_id FROM public.barbers WHERE owner_id = NEW.owner_id AND name = NEW.barber LIMIT 1;
  INSERT INTO public.appointments (user_id, owner_id, barbershop_id, service, barber, barber_id, price, appointment_date, appointment_time, status, notes)
  VALUES (NEW.owner_id, NEW.owner_id, NEW.barbershop_id, COALESCE(NEW.service,'Serviço'), COALESCE(NEW.barber,'Sem preferência'), _barber_id,
          COALESCE(_price,0), COALESCE(NEW.preferred_date, CURRENT_DATE), COALESCE(NEW.preferred_time,'09:00'), 'pendente',
          NEW.name || '||' || COALESCE(NEW.phone,'') || '||' || COALESCE(NEW.notes,'') || ' [guest]');
  NEW.status := 'agendado';
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.guest_booking_to_appointment() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_guest_booking_to_appointment ON public.guest_bookings;
CREATE TRIGGER trg_guest_booking_to_appointment BEFORE INSERT ON public.guest_bookings
FOR EACH ROW EXECUTE FUNCTION public.guest_booking_to_appointment();