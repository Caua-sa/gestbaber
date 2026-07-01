-- Theme preference per user
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'dark' CHECK (theme_preference IN ('dark','light'));

-- WhatsApp bot configuration on whatsapp_settings
ALTER TABLE public.whatsapp_settings ADD COLUMN IF NOT EXISTS bot_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.whatsapp_settings ADD COLUMN IF NOT EXISTS confirmation_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.whatsapp_settings ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.whatsapp_settings ADD COLUMN IF NOT EXISTS expiration_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.whatsapp_settings ADD COLUMN IF NOT EXISTS birthday_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.whatsapp_settings ADD COLUMN IF NOT EXISTS reminder_lead_hours INT DEFAULT 24;
ALTER TABLE public.whatsapp_settings ADD COLUMN IF NOT EXISTS expiration_lead_days INT DEFAULT 3;
ALTER TABLE public.whatsapp_settings ADD COLUMN IF NOT EXISTS template_confirmation TEXT DEFAULT 'Olá {nome}! ✅ Seu agendamento em *{barbearia}* está confirmado para {data} às {hora}. Serviço: {servico}. Nos vemos em breve!';
ALTER TABLE public.whatsapp_settings ADD COLUMN IF NOT EXISTS template_reminder TEXT DEFAULT 'Oi {nome}! ⏰ Lembrete: você tem horário amanhã em *{barbearia}* às {hora} ({servico}). Até lá!';
ALTER TABLE public.whatsapp_settings ADD COLUMN IF NOT EXISTS template_expiration TEXT DEFAULT 'Olá {nome}! Sua assinatura *{plano}* vence em {dias} dia(s). Renove aqui: {link}';
ALTER TABLE public.whatsapp_settings ADD COLUMN IF NOT EXISTS template_birthday TEXT DEFAULT '🎂 Feliz aniversário, {nome}! Ganhe 10% de desconto hoje em *{barbearia}*. Vamos comemorar juntos!';

-- Tracking to avoid duplicate sends
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS renewal_notified_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthday_greeted_year INT;

-- Enable extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;