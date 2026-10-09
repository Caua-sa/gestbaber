ALTER POLICY "Superadmin can update all barbershops" ON public.barbershops TO authenticated;
ALTER POLICY "Superadmin can delete barbershops" ON public.barbershops TO authenticated;
ALTER POLICY "Superadmin can view all barbershops" ON public.barbershops TO authenticated;
ALTER POLICY "Owner can manage own marketing media" ON public.marketing_media TO authenticated;
-- lets the public booking page recognise an existing client by phone, returning only the user id
CREATE OR REPLACE FUNCTION public.find_client_by_phone(_owner_id uuid, _phone text)
RETURNS TABLE(user_id uuid, full_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, p.full_name FROM public.profiles p
  WHERE length(regexp_replace(_phone,'\D','','g')) >= 8
    AND right(regexp_replace(coalesce(p.phone,''),'\D','','g'), 9) = right(regexp_replace(_phone,'\D','','g'), 9)
  LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.find_client_by_phone(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_client_by_phone(uuid, text) TO anon, authenticated;
ALTER TABLE public.guest_bookings ADD COLUMN IF NOT EXISTS client_user_id uuid;
CREATE OR REPLACE FUNCTION public.guest_booking_to_appointment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _price numeric := 0; _barber_id uuid; _uid uuid;
BEGIN
  SELECT price INTO _price FROM public.services WHERE owner_id = NEW.owner_id AND name = NEW.service AND active LIMIT 1;
  SELECT id INTO _barber_id FROM public.barbers WHERE owner_id = NEW.owner_id AND name = NEW.barber LIMIT 1;
  IF NEW.phone IS NOT NULL AND length(NEW.phone) >= 8 THEN
    SELECT f.user_id INTO _uid FROM public.find_client_by_phone(NEW.owner_id, NEW.phone) f;
  END IF;
  NEW.client_user_id := _uid;
  INSERT INTO public.appointments (user_id, owner_id, barbershop_id, service, barber, barber_id, price, appointment_date, appointment_time, status, notes)
  VALUES (COALESCE(_uid, NEW.owner_id), NEW.owner_id, NEW.barbershop_id, COALESCE(NEW.service,'Serviço'), COALESCE(NEW.barber,'Sem preferência'), _barber_id,
          COALESCE(_price,0), COALESCE(NEW.preferred_date, CURRENT_DATE), COALESCE(NEW.preferred_time,'09:00'), 'pendente',
          NEW.name || '||' || COALESCE(NEW.phone,'') || '||' || COALESCE(NEW.notes,'') || CASE WHEN _uid IS NULL THEN ' [guest]' ELSE '' END);
  NEW.status := 'agendado';
  RETURN NEW;
END $$;