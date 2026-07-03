ALTER TABLE public.subscriptions REPLICA IDENTITY FULL;
ALTER TABLE public.mp_subscriptions REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mp_subscriptions;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;