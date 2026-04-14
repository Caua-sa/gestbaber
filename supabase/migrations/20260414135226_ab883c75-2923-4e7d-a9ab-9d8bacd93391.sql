
-- Drop overly permissive policies on landing_page_settings
DROP POLICY IF EXISTS "Authenticated users can delete landing settings" ON public.landing_page_settings;
DROP POLICY IF EXISTS "Authenticated users can insert landing settings" ON public.landing_page_settings;
DROP POLICY IF EXISTS "Authenticated users can update landing settings" ON public.landing_page_settings;

-- Replace with admin-only policies
CREATE POLICY "Admins can insert landing settings"
ON public.landing_page_settings FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update landing settings"
ON public.landing_page_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete landing settings"
ON public.landing_page_settings FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
