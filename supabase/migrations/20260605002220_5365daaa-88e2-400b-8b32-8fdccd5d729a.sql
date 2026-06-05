
-- Trigger: ensure subscription expires_at is always started_at + 1 month
CREATE OR REPLACE FUNCTION public.set_subscription_expiry()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.started_at IS NULL THEN
    NEW.started_at := now();
  END IF;
  NEW.expires_at := NEW.started_at + INTERVAL '1 month';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subscriptions_set_expiry ON public.subscriptions;
CREATE TRIGGER subscriptions_set_expiry
  BEFORE INSERT OR UPDATE OF started_at ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_subscription_expiry();

-- Backfill existing
UPDATE public.subscriptions
SET expires_at = started_at + INTERVAL '1 month'
WHERE expires_at IS NULL OR expires_at <> started_at + INTERVAL '1 month';
