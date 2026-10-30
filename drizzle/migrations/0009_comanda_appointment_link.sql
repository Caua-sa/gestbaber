ALTER TABLE public.comandas ADD COLUMN IF NOT EXISTS appointment_id uuid;
CREATE INDEX IF NOT EXISTS comandas_appointment_idx ON public.comandas(appointment_id);