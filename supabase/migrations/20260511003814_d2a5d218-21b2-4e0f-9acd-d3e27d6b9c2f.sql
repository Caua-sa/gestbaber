
INSERT INTO storage.buckets (id, name, public) VALUES ('barbershop-logos', 'barbershop-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read barbershop logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'barbershop-logos');

CREATE POLICY "Owners upload barbershop logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'barbershop-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners update barbershop logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'barbershop-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners delete barbershop logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'barbershop-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
