CREATE TABLE public.admin_push_devices (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, owner_id uuid NOT NULL, token text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.admin_push_devices TO service_role;
ALTER TABLE public.admin_push_devices ENABLE ROW LEVEL SECURITY;
CREATE INDEX admin_push_devices_owner ON public.admin_push_devices(owner_id);
CREATE TABLE public.appointment_push_jobs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), appointment_id uuid NOT NULL UNIQUE, secret uuid NOT NULL DEFAULT gen_random_uuid(), delivered_tokens text[] NOT NULL DEFAULT '{}', completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.appointment_push_jobs TO service_role;
ALTER TABLE public.appointment_push_jobs ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.enqueue_appointment_push() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE job public.appointment_push_jobs;
BEGIN
 IF NEW.owner_id IS NULL OR NEW.status IN ('bloqueado','cancelado','concluido') THEN RETURN NEW; END IF;
 INSERT INTO public.appointment_push_jobs(appointment_id) VALUES(NEW.id) RETURNING * INTO job;
 PERFORM net.http_post(url := 'https://gjfdpphvhbnsxvmyqnpf.supabase.co/functions/v1/admin-appointment-push', headers := '{"Content-Type":"application/json"}'::jsonb, body := jsonb_build_object('action','dispatch','jobId',job.id,'secret',job.secret));
 RETURN NEW;
EXCEPTION WHEN OTHERS THEN
 RAISE WARNING 'Appointment push queue failed: %', SQLERRM;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enqueue_appointment_push() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_appointment_push() TO service_role;
CREATE TRIGGER appointment_browser_push AFTER INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.enqueue_appointment_push();