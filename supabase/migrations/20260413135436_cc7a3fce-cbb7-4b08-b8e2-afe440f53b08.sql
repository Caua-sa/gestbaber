
CREATE TABLE public.landing_page_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section text NOT NULL,
  key text NOT NULL,
  value text NOT NULL DEFAULT '',
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(section, key)
);

ALTER TABLE public.landing_page_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landing settings are publicly readable"
ON public.landing_page_settings FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert landing settings"
ON public.landing_page_settings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update landing settings"
ON public.landing_page_settings FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete landing settings"
ON public.landing_page_settings FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_landing_page_settings_updated_at
BEFORE UPDATE ON public.landing_page_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default content
INSERT INTO public.landing_page_settings (section, key, value) VALUES
('hero', 'title', 'BARBER PRO'),
('hero', 'subtitle', 'Estilo e precisão em cada corte'),
('hero', 'cta_text', 'Agendar Agora'),
('about', 'title', 'Sobre Nós'),
('about', 'description', 'Somos uma barbearia moderna dedicada a oferecer o melhor em cortes masculinos, barba e tratamentos capilares. Nossa equipe de barbeiros experientes está pronta para transformar seu visual.'),
('services', 'title', 'Nossos Serviços'),
('services', 'service_1_name', 'Corte Masculino'),
('services', 'service_1_price', 'R$ 45'),
('services', 'service_1_desc', 'Corte personalizado com acabamento perfeito'),
('services', 'service_2_name', 'Barba'),
('services', 'service_2_price', 'R$ 35'),
('services', 'service_2_desc', 'Modelagem e aparação profissional'),
('services', 'service_3_name', 'Combo Completo'),
('services', 'service_3_price', 'R$ 75'),
('services', 'service_3_desc', 'Corte + barba + hidratação'),
('services', 'service_4_name', 'Pigmentação'),
('services', 'service_4_price', 'R$ 60'),
('services', 'service_4_desc', 'Coloração e pigmentação capilar'),
('contact', 'phone', '(11) 99999-9999'),
('contact', 'address', 'Rua dos Barbeiros, 123 - Centro'),
('contact', 'hours', 'Seg-Sáb: 9h às 20h'),
('contact', 'instagram', '@barberpro'),
('footer', 'text', '© 2026 Barber Pro. Todos os direitos reservados.');
