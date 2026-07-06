
-- Signup OTP table (WhatsApp confirmation code)
CREATE TABLE IF NOT EXISTS public.signup_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  full_name TEXT,
  attempts INT NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_signup_otps_phone ON public.signup_otps(phone);
GRANT ALL ON public.signup_otps TO service_role;
ALTER TABLE public.signup_otps ENABLE ROW LEVEL SECURITY;
-- No policies -> only service_role via edge functions can access

-- Enable realtime on appointments for the schedule
ALTER TABLE public.appointments REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='appointments'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments';
  END IF;
END $$;
