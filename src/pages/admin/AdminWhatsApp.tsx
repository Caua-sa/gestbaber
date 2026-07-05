import { useEffect, useState } from "react";
import { MessageCircle, Save, Send, Loader2, Bot, PlayCircle, QrCode, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAccountOwner } from "@/hooks/useAccountOwner";
import { toast } from "sonner";

interface Bot {
  bot_enabled: boolean;
  confirmation_enabled: boolean;
  reminder_enabled: boolean;
  reminder_1h_enabled: boolean;
  expiration_enabled: boolean;
  birthday_enabled: boolean;
  reminder_lead_hours: number;
  expiration_lead_days: number;
  birthday_discount_percent: number;
  birthday_valid_days: number;
  template_confirmation: string;
  template_reminder: string;
  template_reminder_1h: string;
  template_expiration: string;
  template_birthday: string;
}

const defaultBot: Bot = {
  bot_enabled: true,
  confirmation_enabled: true,
  reminder_enabled: true,
  reminder_1h_enabled: true,
  expiration_enabled: true,
  birthday_enabled: true,
  reminder_lead_hours: 24,
  expiration_lead_days: 3,
  birthday_discount_percent: 10,
  birthday_valid_days: 1,
  template_confirmation: "Olá {nome}! ✅ Seu agendamento em *{barbearia}* está confirmado para {data} às {hora}. Serviço: {servico}. Nos vemos em breve!",
  template_reminder: "Oi {nome}! ⏰ Lembrete: você tem horário amanhã em *{barbearia}* às {hora} ({servico}). Até lá!",
  template_reminder_1h: "Oi {nome}! ⏰ Faltam ~1h pro seu horário em *{barbearia}* às {hora} ({servico}). Até já!",
  template_expiration: "Olá {nome}! Sua assinatura *{plano}* vence em {dias} dia(s). Renove aqui: {link}",
  template_birthday: "🎂 Feliz aniversário, {nome}! Ganhe {desconto}% de desconto por {validade} dia(s) em *{barbearia}*. Aproveite!",
};

export default function AdminWhatsApp() {
  const { ownerId, isOwner } = useAccountOwner();
  const [form, setForm] = useState({
    mode: "cloud" as "cloud" | "baileys",
    phone_number_id: "",
    access_token: "",
    business_account_id: "",
    display_number: "",
    baileys_url: "",
    baileys_token: "",
  });
  const [bot, setBot] = useState<Bot>(defaultBot);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [runningBot, setRunningBot] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<string>("disconnected");
  const [loadingQr, setLoadingQr] = useState(false);

  useEffect(() => {
    if (!ownerId) return;
    (async () => {
      const { data } = await supabase.from("whatsapp_settings").select("*").eq("owner_id", ownerId).maybeSingle();
      if (data) {
        setForm({
          mode: ((data as any).mode || "cloud") as "cloud" | "baileys",
          phone_number_id: data.phone_number_id || "",
          access_token: data.access_token || "",
          business_account_id: data.business_account_id || "",
          display_number: data.display_number || "",
          baileys_url: (data as any).baileys_url || "",
          baileys_token: (data as any).baileys_token || "",
        });
        setQrStatus((data as any).baileys_status || "disconnected");
        setBot({
          bot_enabled: (data as any).bot_enabled ?? true,
          confirmation_enabled: (data as any).confirmation_enabled ?? true,
          reminder_enabled: (data as any).reminder_enabled ?? true,
          reminder_1h_enabled: (data as any).reminder_1h_enabled ?? true,
          expiration_enabled: (data as any).expiration_enabled ?? true,
          birthday_enabled: (data as any).birthday_enabled ?? true,
          reminder_lead_hours: (data as any).reminder_lead_hours ?? 24,
          expiration_lead_days: (data as any).expiration_lead_days ?? 3,
          birthday_discount_percent: (data as any).birthday_discount_percent ?? 10,
          birthday_valid_days: (data as any).birthday_valid_days ?? 1,
          template_confirmation: (data as any).template_confirmation ?? defaultBot.template_confirmation,
          template_reminder: (data as any).template_reminder ?? defaultBot.template_reminder,
          template_reminder_1h: (data as any).template_reminder_1h ?? defaultBot.template_reminder_1h,
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
    if (error) toast.error(error.message); else toast.success("Configuração salva");
    setSaving(false);
  };

  const sendTest = async () => {
    if (!testTo) { toast.error("Informe o número"); return; }
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("whatsapp-send", { body: { to: testTo, message: "✅ Teste — Barber Pro" } });
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

  const fetchQr = async () => {
    setLoadingQr(true);
    const { data, error } = await supabase.functions.invoke("whatsapp-bridge", { body: { action: "qr" } });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Erro ao buscar QR");
    } else {
      setQrData((data as any)?.qr || null);
      setQrStatus((data as any)?.status || "disconnected");
    }
    setLoadingQr(false);
  };

  const checkStatus = async () => {
    const { data } = await supabase.functions.invoke("whatsapp-bridge", { body: { action: "status" } });
    setQrStatus((data as any)?.status || "disconnected");
  };

  if (loading) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-4xl font-display gold-text flex items-center gap-3">
          <MessageCircle className="h-8 w-8" /> WhatsApp
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Conecte via Meta Cloud API ou WhatsApp Web (QR) e configure o bot.</p>
      </div>

      {!isOwner ? (
        <p className="text-sm text-warning bg-warning/10 border border-warning/30 rounded-lg p-3">Somente o dono da barbearia pode editar essas credenciais.</p>
      ) : (
        <Tabs defaultValue="qr">
          <TabsList>
            <TabsTrigger value="qr"><QrCode className="h-4 w-4 mr-1" /> QR Code</TabsTrigger>
            <TabsTrigger value="conn">Cloud API</TabsTrigger>
            <TabsTrigger value="bot"><Bot className="h-4 w-4 mr-1" /> Bot</TabsTrigger>
            <TabsTrigger value="test">Testar</TabsTrigger>
          </TabsList>

          {/* QR / Baileys */}
          <TabsContent value="qr" className="mt-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-lg">Conectar via QR (WhatsApp Web)</p>
                  <p className="text-xs text-muted-foreground">Requer servidor Baileys externo. Veja <code>baileys-server/README.md</code>.</p>
                </div>
                <Badge variant="outline" className={qrStatus === "connected" ? "border-success/40 text-success" : "border-muted-foreground/30 text-muted-foreground"}>
                  {qrStatus}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.mode === "baileys"} onCheckedChange={(v) => setForm({ ...form, mode: v ? "baileys" : "cloud" })} />
                <span className="text-sm">Usar Baileys como envio padrão</span>
              </div>
              <div className="space-y-2">
                <Label>URL do servidor Baileys</Label>
                <Input value={form.baileys_url} onChange={(e) => setForm({ ...form, baileys_url: e.target.value })} placeholder="https://seu-servidor.up.railway.app" />
              </div>
              <div className="space-y-2">
                <Label>Token compartilhado (SHARED_TOKEN)</Label>
                <Input type="password" value={form.baileys_token} onChange={(e) => setForm({ ...form, baileys_token: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button onClick={save} disabled={saving} className="gold-gradient text-primary-foreground gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
                </Button>
                <Button onClick={fetchQr} disabled={loadingQr || !form.baileys_url} variant="outline" className="gap-2">
                  {loadingQr ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />} Gerar QR
                </Button>
                <Button onClick={checkStatus} variant="ghost" size="sm" className="gap-1"><RefreshCw className="h-3 w-3" /> Status</Button>
                <a href="https://web.whatsapp.com" target="_blank" rel="noreferrer" className="text-sm text-primary flex items-center gap-1 ml-auto">
                  <ExternalLink className="h-3 w-3" /> WhatsApp Web
                </a>
              </div>
              {qrData && (
                <div className="border border-border rounded-lg p-4 flex flex-col items-center gap-2 bg-background">
                  <img src={qrData} alt="QR Code" className="w-64 h-64" />
                  <p className="text-xs text-muted-foreground text-center">
                    No celular: WhatsApp → ⋮ → Aparelhos conectados → Conectar aparelho → escaneie o QR.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Cloud API */}
          <TabsContent value="conn" className="mt-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="space-y-2">
                <Label>Phone Number ID</Label>
                <Input value={form.phone_number_id} onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Access Token</Label>
                <Input type="password" value={form.access_token} onChange={(e) => setForm({ ...form, access_token: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Business Account ID (opcional)</Label>
                <Input value={form.business_account_id} onChange={(e) => setForm({ ...form, business_account_id: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Número de exibição</Label>
                <Input value={form.display_number} onChange={(e) => setForm({ ...form, display_number: e.target.value })} />
              </div>
              <Button onClick={save} disabled={saving} className="gold-gradient text-primary-foreground gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
              </Button>
            </div>
          </TabsContent>

          {/* Bot */}
          <TabsContent value="bot" className="mt-4 space-y-4">
            <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
              <div>
                <p className="font-display text-lg">Bot Ativado</p>
                <p className="text-xs text-muted-foreground">Automação a cada 15 minutos.</p>
              </div>
              <Switch checked={bot.bot_enabled} onCheckedChange={(v) => setBot({ ...bot, bot_enabled: v })} />
            </div>

            {[
              { key: "confirmation_enabled", title: "Confirmação de Agendamento", desc: "Enviada logo após o cliente agendar.", tKey: "template_confirmation", vars: "{nome} {barbearia} {data} {hora} {servico}" },
              { key: "reminder_enabled", title: "Lembrete 24h antes", desc: "Enviado no dia anterior.", tKey: "template_reminder", vars: "{nome} {barbearia} {hora} {servico}", extra: "hours" as const },
              { key: "reminder_1h_enabled", title: "Lembrete 1h antes", desc: "Enviado 1 hora antes do horário.", tKey: "template_reminder_1h", vars: "{nome} {barbearia} {hora} {servico}" },
              { key: "expiration_enabled", title: "Vencimento de Assinatura", desc: "Aviso antes de expirar.", tKey: "template_expiration", vars: "{nome} {plano} {dias} {link}", extra: "days" as const },
              { key: "birthday_enabled", title: "Aniversário do Cliente", desc: "Cupom automático no dia do aniversário.", tKey: "template_birthday", vars: "{nome} {barbearia} {desconto} {validade}", extra: "birthday" as const },
            ].map((f) => (
              <div key={f.key} className="bg-card border border-border rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display text-lg">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                  <Switch checked={(bot as any)[f.key]} onCheckedChange={(v) => setBot({ ...bot, [f.key]: v } as any)} />
                </div>
                {f.extra === "hours" && (
                  <div className="flex items-center gap-2 text-sm">
                    <Label className="text-xs">Enviar</Label>
                    <Input type="number" min={1} max={168} className="w-20" value={bot.reminder_lead_hours} onChange={(e) => setBot({ ...bot, reminder_lead_hours: Number(e.target.value) })} />
                    <span className="text-muted-foreground text-xs">horas antes</span>
                  </div>
                )}
                {f.extra === "days" && (
                  <div className="flex items-center gap-2 text-sm">
                    <Label className="text-xs">Enviar</Label>
                    <Input type="number" min={1} max={30} className="w-20" value={bot.expiration_lead_days} onChange={(e) => setBot({ ...bot, expiration_lead_days: Number(e.target.value) })} />
                    <span className="text-muted-foreground text-xs">dias antes</span>
                  </div>
                )}
                {f.extra === "birthday" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">% de desconto</Label>
                      <Input type="number" min={1} max={100} value={bot.birthday_discount_percent} onChange={(e) => setBot({ ...bot, birthday_discount_percent: Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label className="text-xs">Validade (dias)</Label>
                      <Input type="number" min={1} max={30} value={bot.birthday_valid_days} onChange={(e) => setBot({ ...bot, birthday_valid_days: Number(e.target.value) })} />
                    </div>
                  </div>
                )}
                <Textarea rows={3} value={(bot as any)[f.tKey]} onChange={(e) => setBot({ ...bot, [f.tKey]: e.target.value } as any)} />
                <p className="text-[11px] text-muted-foreground">Variáveis: <code className="text-primary">{f.vars}</code></p>
              </div>
            ))}

            <div className="flex gap-2">
              <Button onClick={save} disabled={saving} className="gold-gradient text-primary-foreground gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar Bot
              </Button>
              <Button onClick={runBotNow} disabled={runningBot} variant="outline" className="gap-2">
                {runningBot ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />} Executar agora
              </Button>
            </div>
          </TabsContent>

          {/* Test */}
          <TabsContent value="test" className="mt-4">
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h2 className="font-display text-xl">Testar envio</h2>
              <div className="flex gap-2">
                <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="Ex: 5511999999999" />
                <Button onClick={sendTest} disabled={testing} className="gap-2">
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
