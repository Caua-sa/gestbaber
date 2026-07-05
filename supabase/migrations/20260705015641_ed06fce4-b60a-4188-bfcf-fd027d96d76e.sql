
ALTER TABLE public.whatsapp_settings
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'cloud',
  ADD COLUMN IF NOT EXISTS baileys_url TEXT,
  ADD COLUMN IF NOT EXISTS baileys_token TEXT,
  ADD COLUMN IF NOT EXISTS baileys_status TEXT DEFAULT 'disconnected',
  ADD COLUMN IF NOT EXISTS reminder_1h_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS template_reminder_1h TEXT DEFAULT 'Oi {nome}! ⏰ Faltam ~1h pro seu horário em *{barbearia}* às {hora} ({servico}). Até já!',
  ADD COLUMN IF NOT EXISTS birthday_discount_percent INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS birthday_valid_days INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminder_1h_sent_at TIMESTAMPTZ;

ALTER TABLE public.barbers
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  phone TEXT NOT NULL,
  user_id UUID,
  state TEXT NOT NULL DEFAULT 'menu',
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  escalated BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_id, phone)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_conversations TO authenticated;
GRANT ALL ON public.whatsapp_conversations TO service_role;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own conversations"
  ON public.whatsapp_conversations FOR SELECT TO authenticated
  USING (owner_id = public.get_account_owner(auth.uid()));
CREATE POLICY "Owner updates own conversations"
  ON public.whatsapp_conversations FOR UPDATE TO authenticated
  USING (owner_id = public.get_account_owner(auth.uid()));

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  direction TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own messages"
  ON public.whatsapp_messages FOR SELECT TO authenticated
  USING (owner_id = public.get_account_owner(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_wa_conv_owner_phone ON public.whatsapp_conversations(owner_id, phone);
CREATE INDEX IF NOT EXISTS idx_wa_msg_conv ON public.whatsapp_messages(conversation_id, created_at DESC);
