import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Save, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountOwner } from "@/hooks/useAccountOwner";
import { toast } from "sonner";

export default function AdminMercadoPago() {
  const { user } = useAuth();
  const { ownerId, isOwner, loading: ownerLoading } = useAccountOwner();
  const [accessToken, setAccessToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    if (!user || !ownerId) return;
    (async () => {
      const { data: s } = await supabase.from("mp_settings").select("*").eq("user_id", ownerId).maybeSingle();
      if (s) { setAccessToken(s.access_token); setPublicKey(s.public_key); setActive(s.active); setExists(true); }
      setLoading(false);
    })();
  }, [user, ownerId]);

  const save = async () => {
    if (!user || !ownerId || !isOwner) return;
    if (!accessToken.trim() || !publicKey.trim()) {
      toast.error("Preencha Access Token e Public Key");
      return;
    }
    setSaving(true);
    const payload = { user_id: ownerId, access_token: accessToken.trim(), public_key: publicKey.trim(), active };
    const { error } = exists
      ? await supabase.from("mp_settings").update(payload).eq("user_id", ownerId)
      : await supabase.from("mp_settings").insert(payload);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else { toast.success("Configurações salvas com sucesso!"); setExists(true); }
    setSaving(false);
  };

  if (loading || ownerLoading) return <div className="text-muted-foreground">Carregando...</div>;
  if (!isOwner) return <div className="text-destructive font-display text-xl">Apenas o dono da barbearia pode alterar o Mercado Pago.</div>;

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
          exists && active ? "bg-success/10 border-success/30" : "bg-secondary border-border"
        }`}
      >
        {exists && active ? (
          <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        )}
        <div className="text-sm">
          <p className="font-medium">
            {exists && active ? "Mercado Pago conectado e ativo" : exists ? "Configurado mas inativo" : "Mercado Pago ainda não configurado"}
          </p>
          <p className="text-muted-foreground mt-1">
            Os planos recorrentes agora ficam na aba <span className="text-primary font-medium">Assinaturas</span>.
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
          <Input type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="APP_USR-..." className="bg-secondary border-border font-mono text-xs" />
          <p className="text-xs text-muted-foreground">Fica armazenado de forma segura e nunca é exposto ao cliente.</p>
        </div>

        <div className="space-y-2">
          <Label>Public Key</Label>
          <Input value={publicKey} onChange={(e) => setPublicKey(e.target.value)} placeholder="APP_USR-..." className="bg-secondary border-border font-mono text-xs" />
        </div>

        <div className="flex items-center justify-between bg-secondary/50 border border-border rounded-lg p-3">
          <div>
            <p className="text-sm font-medium">Aceitar pagamentos</p>
            <p className="text-xs text-muted-foreground">Desative para pausar cobranças via MP.</p>
          </div>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>

        <div className="flex gap-3 flex-wrap">
          <Button onClick={save} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar configurações"}
          </Button>
          <a href="https://www.mercadopago.com.br/developers/panel/app" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline px-3">
            Onde encontrar minhas chaves <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

