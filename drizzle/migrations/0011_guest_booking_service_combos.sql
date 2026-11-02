ALTER TABLE public.guest_bookings ADD COLUMN service_ids uuid[] NOT NULL DEFAULT '{}';
CREATE OR REPLACE FUNCTION public.guest_booking_to_appointment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _price numeric := 0; _barber_id uuid; _uid uuid; _service text; _count integer;
BEGIN
  IF cardinality(NEW.service_ids) > 0 THEN
    IF cardinality(NEW.service_ids) <> (SELECT count(DISTINCT id) FROM unnest(NEW.service_ids) AS id) THEN
      RAISE EXCEPTION 'Serviços duplicados no combo';
    END IF;
    SELECT count(*), sum(s.price), string_agg(s.name, ' + ' ORDER BY array_position(NEW.service_ids, s.id))
      INTO _count, _price, _service
      FROM public.services s
      WHERE s.id = ANY(NEW.service_ids) AND s.owner_id = NEW.owner_id AND s.active;
    IF _count <> cardinality(NEW.service_ids) THEN
      RAISE EXCEPTION 'Um serviço do combo não está mais disponível';
    END IF;
    NEW.service := _service;
  ELSE
    SELECT price INTO _price FROM public.services WHERE owner_id = NEW.owner_id AND name = NEW.service AND active LIMIT 1;
  END IF;
  SELECT id INTO _barber_id FROM public.barbers WHERE owner_id = NEW.owner_id AND name = NEW.barber LIMIT 1;
  IF NEW.phone IS NOT NULL AND length(NEW.phone) >= 8 THEN
    SELECT f.user_id INTO _uid FROM public.find_client_by_phone(NEW.owner_id, NEW.phone) f;
  END IF;
  NEW.client_user_id := _uid;
  INSERT INTO public.appointments (user_id, owner_id, barbershop_id, service, barber, barber_id, price, appointment_date, appointment_time, status, notes)
  VALUES (COALESCE(_uid, NEW.owner_id), NEW.owner_id, NEW.barbershop_id, COALESCE(NEW.service,'Serviço'), COALESCE(NEW.barber,'Sem preferência'), _barber_id,
    COALESCE(_price,0), COALESCE(NEW.preferred_date, CURRENT_DATE), COALESCE(NEW.preferred_time,'09:00'), 'confirmado',
    NEW.name || '||' || COALESCE(NEW.phone,'') || '||' || COALESCE(NEW.notes,'') || CASE WHEN _uid IS NULL THEN ' [guest]' ELSE '' END);
  RETURN NEW;
END $function$;
REVOKE EXECUTE ON FUNCTION public.guest_booking_to_appointment() FROM PUBLIC, anon, authenticated;