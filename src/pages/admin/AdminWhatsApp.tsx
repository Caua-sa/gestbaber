import { useEffect, useState } from "react";
import { MessageCircle, Save, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAccountOwner } from "@/hooks/useAccountOwner";
import { toast } from "sonner";

export default function AdminWhatsApp() {
  const { ownerId, isOwner } = useAccountOwner();
  const [form, setForm] = useState({
    phone_number_id: "",
    access_token: "",
    business_account_id: "",
    display_number: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

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
      }
      setLoading(false);
    })();
  }, [ownerId]);

  const save = async () => {
    if (!ownerId) return;
    setSaving(true);
    const { error } = await supabase
      .from("whatsapp_settings")
      .upsert({ owner_id: ownerId, ...form }, { onConflict: "owner_id" });
    if (error) toast.error(error.message);
    else toast.success("Configuração salva");
    setSaving(false);
  };

  const sendTest = async () => {
    if (!testTo) {
      toast.error("Informe o número para teste");
      return;
    }
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("whatsapp-send", {
      body: { to: testTo, message: "✅ Teste de integração WhatsApp — Barber Pro" },
    });
    if (error || (data as any)?.error) toast.error((data as any)?.error || error?.message || "Erro");
    else toast.success("Mensagem enviada");
    setTesting(false);
  };

  if (loading) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-4xl font-display gold-text flex items-center gap-3">
          <MessageCircle className="h-8 w-8" /> WhatsApp
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Conecte o WhatsApp Business da sua barbearia (Meta Cloud API).
        </p>
      </div>

      {!isOwner ? (
        <p className="text-sm text-warning bg-warning/10 border border-warning/30 rounded-lg p-3">
          Somente o dono da barbearia pode editar essas credenciais.
        </p>
      ) : (
        <>
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="space-y-2">
              <Label>Phone Number ID</Label>
              <Input
                value={form.phone_number_id}
                onChange={(e) => setForm({ ...form, phone_number_id: e.target.value })}
                placeholder="Ex: 123456789012345"
              />
            </div>
            <div className="space-y-2">
              <Label>Access Token (permanente)</Label>
              <Input
                type="password"
                value={form.access_token}
                onChange={(e) => setForm({ ...form, access_token: e.target.value })}
                placeholder="EAAG..."
              />
            </div>
            <div className="space-y-2">
              <Label>Business Account ID (opcional)</Label>
              <Input
                value={form.business_account_id}
                onChange={(e) => setForm({ ...form, business_account_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Número de exibição (com DDI)</Label>
              <Input
                value={form.display_number}
                onChange={(e) => setForm({ ...form, display_number: e.target.value })}
                placeholder="+55 11 99999-9999"
              />
            </div>
            <Button onClick={save} disabled={saving} className="gold-gradient text-primary-foreground gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h2 className="font-display text-xl tracking-wide">Testar envio</h2>
            <div className="flex gap-2">
              <Input
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="Número destinatário (ex: 5511999999999)"
              />
              <Button onClick={sendTest} disabled={testing} className="gap-2">
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Crie um app em <a className="text-primary underline" href="https://developers.facebook.com/" target="_blank" rel="noreferrer">developers.facebook.com</a>,
              adicione o produto WhatsApp e copie o Phone Number ID + Access Token.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
