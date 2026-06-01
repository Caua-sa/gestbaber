import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Save, ExternalLink, CheckCircle2, AlertCircle, Repeat, Plus, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface MpRecurringPlan {
  id: string;
  reason: string;
  amount: number;
  frequency: number;
  frequency_type: string;
  status: string;
  mp_preapproval_plan_id: string;
  init_point: string | null;
  plan_id: string | null;
}
interface LocalPlan { id: string; name: string; price: number }

export default function AdminMercadoPago() {
  const { user } = useAuth();
  const [accessToken, setAccessToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("mp_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setAccessToken(data.access_token);
        setPublicKey(data.public_key);
        setActive(data.active);
        setExists(true);
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    if (!accessToken.trim() || !publicKey.trim()) {
      toast.error("Preencha Access Token e Public Key");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      access_token: accessToken.trim(),
      public_key: publicKey.trim(),
      active,
    };
    const { error } = exists
      ? await supabase.from("mp_settings").update(payload).eq("user_id", user.id)
      : await supabase.from("mp_settings").insert(payload);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else {
      toast.success("Configurações salvas com sucesso!");
      setExists(true);
    }
    setSaving(false);
  };

  if (loading) return <div className="text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-4xl font-display gold-text">Mercado Pago</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Conecte sua conta do Mercado Pago para receber pagamentos via PIX, cartão e boleto.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 rounded-lg border flex items-start gap-3 ${
          exists && active
            ? "bg-success/10 border-success/30"
            : "bg-secondary border-border"
        }`}
      >
        {exists && active ? (
          <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        )}
        <div className="text-sm">
          <p className="font-medium">
            {exists && active
              ? "Mercado Pago conectado e ativo"
              : exists
              ? "Configurado mas inativo"
              : "Mercado Pago ainda não configurado"}
          </p>
          <p className="text-muted-foreground mt-1">
            Cada barbearia usa sua própria conta — pagamentos caem direto na sua conta do Mercado Pago.
          </p>
        </div>
      </motion.div>

      <div className="bg-card border border-border rounded-lg p-6 space-y-5">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl tracking-wide">Credenciais</h2>
        </div>

        <div className="space-y-2">
          <Label>Access Token (privado)</Label>
          <Input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="APP_USR-..."
            className="bg-secondary border-border font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            Fica armazenado de forma segura e nunca é exposto ao cliente.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Public Key</Label>
          <Input
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            placeholder="APP_USR-..."
            className="bg-secondary border-border font-mono text-xs"
          />
        </div>

        <div className="flex items-center justify-between bg-secondary/50 border border-border rounded-lg p-3">
          <div>
            <p className="text-sm font-medium">Aceitar pagamentos</p>
            <p className="text-xs text-muted-foreground">Desative para pausar cobranças via MP.</p>
          </div>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>

        <div className="flex gap-3">
          <Button onClick={save} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar configurações"}
          </Button>
          <a
            href="https://www.mercadopago.com.br/developers/panel/app"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline px-3"
          >
            Onde encontrar minhas chaves <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <div className="bg-card/50 border border-border rounded-lg p-5 text-sm text-muted-foreground space-y-2">
        <p className="font-medium text-foreground">Como obter suas credenciais:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Acesse o painel de desenvolvedores do Mercado Pago.</li>
          <li>Crie ou selecione uma aplicação do tipo “Pagamentos online”.</li>
          <li>Em “Credenciais de produção”, copie o <strong>Access Token</strong> e a <strong>Public Key</strong>.</li>
          <li>Cole nos campos acima e salve.</li>
        </ol>
      </div>
    </div>
  );
}
