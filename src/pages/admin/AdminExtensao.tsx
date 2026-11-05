import { useEffect, useState } from "react";
import { Puzzle, Copy, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAccountOwner } from "@/hooks/useAccountOwner";
import { toast } from "sonner";

const copy = (v: string) => { navigator.clipboard.writeText(v); toast.success("Copiado"); };

export default function AdminExtensao() {
  const { ownerId } = useAccountOwner();
  const [shop, setShop] = useState<{ id: string; slug: string; name: string } | null>(null);
  const [botUrl, setBotUrl] = useState("");
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);

  const webhook = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/whatsapp-bot-inbound`;

  useEffect(() => {
    if (!ownerId || typeof ownerId !== "string") return;
    supabase.from("barbershops").select("id,slug,name").eq("owner_id", ownerId).maybeSingle().then(({ data }) => setShop(data as any));
    supabase.from("whatsapp_settings").select("mode,baileys_url,baileys_token").eq("owner_id", ownerId).maybeSingle().then(({ data }) => {
      if (data && (data as any).mode === "extension") { setBotUrl(data.baileys_url || ""); setToken(data.baileys_token || ""); }
    });
  }, [ownerId]);

  const save = async () => {
    if (!ownerId) return;
    setSaving(true);
    const finalToken = token || crypto.randomUUID().replace(/-/g, "");
    const { error } = await supabase.from("whatsapp_settings").upsert(
      { owner_id: ownerId, mode: "extension", baileys_url: botUrl.trim(), baileys_token: finalToken } as any,
      { onConflict: "owner_id" },
    );
    setSaving(false);
    if (error) return toast.error(error.message);
    setToken(finalToken);
    toast.success("BarberBot conectado");
  };

  const examples: Record<string, object> = {
    criar: { owner_id: ownerId, token, action: "create_appointment", clientName: "Carlos Eduardo", clientPhone: "+55 11 99887-6655", service: "Corte", barber: "Marcos", date: "2026-11-04", time: "15:00", notes: "Agendamento via WhatsApp" },
    consultar: { owner_id: ownerId, token, action: "check_availability", date: "2026-11-04", barber: "Marcos" },
    aviso: { owner_id: ownerId, token, action: "send_reminder", date: "2026-11-04" },
  };

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-mono truncate">{value || "—"}</p>
      </div>
      <Button size="sm" variant="outline" onClick={() => copy(value)}><Copy className="h-3.5 w-3.5" /></Button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Puzzle className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-3xl font-display">Extensão / BarberBot</h1>
          <p className="text-sm text-muted-foreground">Conecte seu app de WhatsApp para agendar, consultar horários e avisar clientes</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <p className="font-display text-lg">Passo 1 — Cole no seu app (URL do Webhook)</p>
        <Field label="URL do Webhook" value={webhook} />
        <Field label="ID da barbearia (owner_id)" value={ownerId || ""} />
        <Field label="Token de segurança" value={token} />
        {!token && <p className="text-xs text-muted-foreground">O token é gerado ao salvar o Passo 2.</p>}
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <p className="font-display text-lg">Passo 2 — URL do seu BarberBot</p>
        <p className="text-xs text-muted-foreground">Cole o "Endpoint Inbound" do seu app. O sistema usará esse endereço para mandar mensagens aos clientes.</p>
        <Label>Endpoint do BarberBot</Label>
        <Input value={botUrl} onChange={(e) => setBotUrl(e.target.value)} placeholder="https://..." />
        <Button onClick={save} disabled={saving || !botUrl.trim()} className="gap-2"><Save className="h-4 w-4" /> Salvar e conectar</Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <p className="font-display text-lg">Modelos de mensagem JSON</p>
        <Tabs defaultValue="criar">
          <TabsList>
            <TabsTrigger value="criar">Criar agendamento</TabsTrigger>
            <TabsTrigger value="consultar">Consultar horários</TabsTrigger>
            <TabsTrigger value="aviso">Aviso de horário</TabsTrigger>
          </TabsList>
          {Object.entries(examples).map(([k, v]) => {
            const json = JSON.stringify(v, null, 2);
            return (
              <TabsContent key={k} value={k} className="space-y-2">
                <pre className="bg-muted/50 border border-border rounded-md p-3 text-xs overflow-x-auto"><code>{json}</code></pre>
                <Button size="sm" variant="outline" onClick={() => copy(json)} className="gap-2"><Copy className="h-3.5 w-3.5" /> Copiar JSON</Button>
              </TabsContent>
            );
          })}
        </Tabs>
        <p className="text-xs text-muted-foreground">Envie por POST para a URL do Webhook. "Aviso de horário" devolve os agendamentos do dia com nome, telefone e mensagem pronta para enviar.</p>
      </div>
    </div>
  );
}
