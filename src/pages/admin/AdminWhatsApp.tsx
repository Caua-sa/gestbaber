import { useEffect, useState } from "react";
import { MessageCircle, Save, Send, Loader2, Bot, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAccountOwner } from "@/hooks/useAccountOwner";
import { toast } from "sonner";

interface Bot {
  bot_enabled: boolean;
  confirmation_enabled: boolean;
  reminder_enabled: boolean;
  expiration_enabled: boolean;
  birthday_enabled: boolean;
  reminder_lead_hours: number;
  expiration_lead_days: number;
  template_confirmation: string;
  template_reminder: string;
  template_expiration: string;
  template_birthday: string;
}

const defaultBot: Bot = {
  bot_enabled: true,
  confirmation_enabled: true,
  reminder_enabled: true,
  expiration_enabled: true,
  birthday_enabled: true,
  reminder_lead_hours: 24,
  expiration_lead_days: 3,
  template_confirmation: "Olá {nome}! ✅ Seu agendamento em *{barbearia}* está confirmado para {data} às {hora}. Serviço: {servico}. Nos vemos em breve!",
  template_reminder: "Oi {nome}! ⏰ Lembrete: você tem horário amanhã em *{barbearia}* às {hora} ({servico}). Até lá!",
  template_expiration: "Olá {nome}! Sua assinatura *{plano}* vence em {dias} dia(s). Renove aqui: {link}",
  template_birthday: "🎂 Feliz aniversário, {nome}! Ganhe 10% de desconto hoje em *{barbearia}*. Vamos comemorar juntos!",
};

export default function AdminWhatsApp() {
  const { ownerId, isOwner } = useAccountOwner();
  const [form, setForm] = useState({
    phone_number_id: "",
    access_token: "",
    business_account_id: "",
    display_number: "",
  });
  const [bot, setBot] = useState<Bot>(defaultBot);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [runningBot, setRunningBot] = useState(false);

  useEffect(() => {
    if (!ownerId) return;
    (async () => {
      const { data } = await supabase
        .from("whatsapp_settings")
        .select("*")
        .eq("owner_id", ownerId)
        .maybeSingle();
      if (data) {
        setForm({
          phone_number_id: data.phone_number_id || "",
          access_token: data.access_token || "",
          business_account_id: data.business_account_id || "",
          display_number: data.display_number || "",
        });
        setBot({
          bot_enabled: (data as any).bot_enabled ?? true,
          confirmation_enabled: (data as any).confirmation_enabled ?? true,
          reminder_enabled: (data as any).reminder_enabled ?? true,
          expiration_enabled: (data as any).expiration_enabled ?? true,
          birthday_enabled: (data as any).birthday_enabled ?? true,
          reminder_lead_hours: (data as any).reminder_lead_hours ?? 24,
          expiration_lead_days: (data as any).expiration_lead_days ?? 3,
          template_confirmation: (data as any).template_confirmation ?? defaultBot.template_confirmation,
          template_reminder: (data as any).template_reminder ?? defaultBot.template_reminder,
          template_expiration: (data as any).template_expiration ?? defaultBot.template_expiration,
          template_birthday: (data as any).template_birthday ?? defaultBot.template_birthday,
        });
      }
      setLoading(false);
    })();
  }, [ownerId]);

  const save = async () => {
    if (!ownerId) return;
    setSaving(true);
    const { error } = await supabase
      .from("whatsapp_settings")
      .upsert({ owner_id: ownerId, ...form, ...bot } as any, { onConflict: "owner_id" });
    if (error) toast.error(error.message);
    else toast.success("Configuração salva");
    setSaving(false);
  };

  const sendTest = async () => {
    if (!testTo) { toast.error("Informe o número"); return; }
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("whatsapp-send", {
      body: { to: testTo, message: "✅ Teste — Barber Pro" },
    });
    if (error || (data as any)?.error) toast.error((data as any)?.error || error?.message || "Erro");
    else toast.success("Mensagem enviada");
    setTesting(false);
  };

  const runBotNow = async () => {
    setRunningBot(true);
    const { data, error } = await supabase.functions.invoke("whatsapp-bot-cron", { body: { owner_id: ownerId } });
    if (error) toast.error(error.message);
    else toast.success(`Bot executado: ${(data as any)?.sent ?? 0} mensagens enviadas`);
    setRunningBot(false);
  };

  if (loading) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-4xl font-display gold-text flex items-center gap-3">
          <MessageCircle className="h-8 w-8" /> WhatsApp
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Conecte o WhatsApp Business (Meta Cloud API) e configure o bot de mensagens automáticas.
        </p>
      </div>

      {!isOwner ? (
        <p className="text-sm text-warning bg-warning/10 border border-warning/30 rounded-lg p-3">
          Somente o dono da barbearia pode editar essas credenciais.
        </p>
      ) : (
        <Tabs defaultValue="conn">
          <TabsList>
            <TabsTrigger value="conn">Conexão</TabsTrigger>
            <TabsTrigger value="bot"><Bot className="h-4 w-4 mr-1" /> Bot Automático</TabsTrigger>
            <TabsTrigger value="test">Testar</TabsTrigger>
          </TabsList>

          <TabsContent value="conn" className="mt-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="space-y-2">
                <Label>Phone Number ID</Label>
                <Input value={form.phone_number_id} onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })} placeholder="Ex: 123456789012345" />
              </div>
              <div className="space-y-2">
                <Label>Access Token (permanente)</Label>
                <Input type="password" value={form.access_token} onChange={(e) => setForm({ ...form, access_token: e.target.value })} placeholder="EAAG..." />
              </div>
              <div className="space-y-2">
                <Label>Business Account ID (opcional)</Label>
                <Input value={form.business_account_id} onChange={(e) => setForm({ ...form, business_account_id: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Número de exibição (com DDI)</Label>
                <Input value={form.display_number} onChange={(e) => setForm({ ...form, display_number: e.target.value })} placeholder="+55 11 99999-9999" />
              </div>
              <Button onClick={save} disabled={saving} className="gold-gradient text-primary-foreground gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="bot" className="mt-4 space-y-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-lg tracking-wide">Bot Ativado</p>
                  <p className="text-xs text-muted-foreground">Liga/desliga toda a automação. Execução: a cada 15 minutos.</p>
                </div>
                <Switch checked={bot.bot_enabled} onCheckedChange={(v) => setBot({ ...bot, bot_enabled: v })} />
              </div>
            </div>

            {[
              { key: "confirmation_enabled", title: "Confirmação de Agendamento", desc: "Enviada logo após o cliente agendar.", tKey: "template_confirmation", vars: "{nome} {barbearia} {data} {hora} {servico}" },
              { key: "reminder_enabled", title: "Lembrete", desc: "Enviado antes do horário marcado.", tKey: "template_reminder", vars: "{nome} {barbearia} {hora} {servico}", extra: "hours" as const },
              { key: "expiration_enabled", title: "Vencimento de Assinatura", desc: "Aviso antes de expirar.", tKey: "template_expiration", vars: "{nome} {plano} {dias} {link}", extra: "days" as const },
              { key: "birthday_enabled", title: "Aniversário do Cliente", desc: "Cupom automático no dia do aniversário.", tKey: "template_birthday", vars: "{nome} {barbearia}" },
            ].map((f) => (
              <div key={f.key} className="bg-card border border-border rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display text-lg tracking-wide">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                  <Switch
                    checked={(bot as any)[f.key]}
                    onCheckedChange={(v) => setBot({ ...bot, [f.key]: v } as any)}
                  />
                </div>
                {f.extra === "hours" && (
                  <div className="flex items-center gap-2 text-sm">
                    <Label className="text-xs">Enviar</Label>
                    <Input type="number" min={1} max={168} className="w-20" value={bot.reminder_lead_hours}
                      onChange={(e) => setBot({ ...bot, reminder_lead_hours: Number(e.target.value) })} />
                    <span className="text-muted-foreground text-xs">horas antes</span>
                  </div>
                )}
                {f.extra === "days" && (
                  <div className="flex items-center gap-2 text-sm">
                    <Label className="text-xs">Enviar</Label>
                    <Input type="number" min={1} max={30} className="w-20" value={bot.expiration_lead_days}
                      onChange={(e) => setBot({ ...bot, expiration_lead_days: Number(e.target.value) })} />
                    <span className="text-muted-foreground text-xs">dias antes</span>
                  </div>
                )}
                <Textarea rows={3} value={(bot as any)[f.tKey]}
                  onChange={(e) => setBot({ ...bot, [f.tKey]: e.target.value } as any)} />
                <p className="text-[11px] text-muted-foreground">Variáveis disponíveis: <code className="text-primary">{f.vars}</code></p>
              </div>
            ))}

            <div className="flex gap-2">
              <Button onClick={save} disabled={saving} className="gold-gradient text-primary-foreground gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Bot
              </Button>
              <Button onClick={runBotNow} disabled={runningBot} variant="outline" className="gap-2">
                {runningBot ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                Executar agora
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="test" className="mt-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h2 className="font-display text-xl tracking-wide">Testar envio</h2>
              <div className="flex gap-2">
                <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="Número destinatário (ex: 5511999999999)" />
                <Button onClick={sendTest} disabled={testing} className="gap-2">
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Enviar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Crie um app em <a className="text-primary underline" href="https://developers.facebook.com/" target="_blank" rel="noreferrer">developers.facebook.com</a>, adicione o produto WhatsApp e copie o Phone Number ID + Access Token.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
