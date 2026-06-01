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

  const [recurringPlans, setRecurringPlans] = useState<MpRecurringPlan[]>([]);
  const [localPlans, setLocalPlans] = useState<LocalPlan[]>([]);
  const [planDialog, setPlanDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [planForm, setPlanForm] = useState({ reason: "", amount: "", frequency: "1", frequency_type: "months", plan_id: "" });

  const fetchAll = async () => {
    if (!user) return;
    const [{ data: s }, { data: rp }, { data: lp }] = await Promise.all([
      supabase.from("mp_settings").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("mp_recurring_plans").select("*").eq("admin_user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("plans").select("id, name, price").eq("owner_id", user.id).eq("active", true).order("name"),
    ]);
    if (s) { setAccessToken(s.access_token); setPublicKey(s.public_key); setActive(s.active); setExists(true); }
    setRecurringPlans((rp || []) as MpRecurringPlan[]);
    setLocalPlans((lp || []).map((p: any) => ({ ...p, price: Number(p.price) })));
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [user]);

  const createRecurringPlan = async () => {
    if (!exists || !active) { toast.error("Salve e ative suas credenciais primeiro"); return; }
    if (!planForm.reason.trim() || !planForm.amount) { toast.error("Preencha nome e valor"); return; }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("mp-create-preapproval-plan", {
      body: {
        reason: planForm.reason.trim(),
        amount: Number(planForm.amount),
        frequency: Number(planForm.frequency) || 1,
        frequency_type: planForm.frequency_type,
        plan_id: planForm.plan_id || null,
      },
    });
    setCreating(false);
    if (error || (data && (data as any).error)) {
      toast.error(((data as any)?.error) || error?.message || "Erro ao criar plano");
      return;
    }
    toast.success("Plano recorrente criado no Mercado Pago!");
    setPlanDialog(false);
    setPlanForm({ reason: "", amount: "", frequency: "1", frequency_type: "months", plan_id: "" });
    fetchAll();
  };

  const deleteRecurringPlan = async (id: string) => {
    if (!confirm("Remover este plano recorrente? (não cancela no MP)")) return;
    const { error } = await supabase.from("mp_recurring_plans").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Removido");
    fetchAll();
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Link copiado!"); };


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

      <Tabs defaultValue="credenciais">
        <TabsList>
          <TabsTrigger value="credenciais">Credenciais</TabsTrigger>
          <TabsTrigger value="recorrentes" className="gap-2"><Repeat className="h-3.5 w-3.5" /> Planos recorrentes</TabsTrigger>
        </TabsList>

        <TabsContent value="credenciais" className="space-y-5 mt-6">
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

          <div className="bg-card/50 border border-border rounded-lg p-5 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Como obter suas credenciais:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Acesse o painel de desenvolvedores do Mercado Pago.</li>
              <li>Crie ou selecione uma aplicação do tipo "Pagamentos online".</li>
              <li>Em "Credenciais de produção", copie o <strong>Access Token</strong> e a <strong>Public Key</strong>.</li>
              <li>Cole nos campos acima e salve.</li>
            </ol>
          </div>
        </TabsContent>

        <TabsContent value="recorrentes" className="space-y-4 mt-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-display text-2xl tracking-wide">Planos de assinatura recorrente</h2>
              <p className="text-xs text-muted-foreground mt-1">Crie planos de cobrança automática no Mercado Pago para receber por assinatura.</p>
            </div>
            <Dialog open={planDialog} onOpenChange={setPlanDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2" disabled={!exists}><Plus className="h-4 w-4" /> Novo plano recorrente</Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader><DialogTitle className="font-display text-xl">Criar plano recorrente no MP</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Nome do plano (ex: Plano Premium)" value={planForm.reason} onChange={e => setPlanForm({ ...planForm, reason: e.target.value })} className="bg-secondary border-border" />
                  <Input type="number" step="0.01" placeholder="Valor (R$)" value={planForm.amount} onChange={e => setPlanForm({ ...planForm, amount: e.target.value })} className="bg-secondary border-border" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="number" placeholder="A cada" value={planForm.frequency} onChange={e => setPlanForm({ ...planForm, frequency: e.target.value })} className="bg-secondary border-border" />
                    <Select value={planForm.frequency_type} onValueChange={v => setPlanForm({ ...planForm, frequency_type: v })}>
                      <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">dias</SelectItem>
                        <SelectItem value="months">meses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {localPlans.length > 0 && (
                    <Select value={planForm.plan_id} onValueChange={v => setPlanForm({ ...planForm, plan_id: v })}>
                      <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Vincular a um plano da barbearia (opcional)" /></SelectTrigger>
                      <SelectContent>
                        {localPlans.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — R$ {p.price}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  <Button onClick={createRecurringPlan} disabled={creating} className="w-full">
                    {creating ? "Criando..." : "Criar no Mercado Pago"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {!exists && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-lg p-3 text-sm">
              Configure suas credenciais na aba "Credenciais" antes de criar planos recorrentes.
            </div>
          )}

          <div className="grid gap-3">
            {recurringPlans.map(p => (
              <div key={p.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-medium">{p.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    R$ {Number(p.amount).toFixed(2)} · a cada {p.frequency} {p.frequency_type === "months" ? "mês(es)" : "dia(s)"} · <span className="text-primary">{p.status}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">ID MP: {p.mp_preapproval_plan_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  {p.init_point && (
                    <>
                      <a href={p.init_point} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                        Abrir <ExternalLink className="h-3 w-3" />
                      </a>
                      <button onClick={() => copy(p.init_point!)} className="p-2 text-muted-foreground hover:text-primary" title="Copiar link"><Copy className="h-4 w-4" /></button>
                    </>
                  )}
                  <button onClick={() => deleteRecurringPlan(p.id)} className="p-2 text-muted-foreground hover:text-destructive" title="Remover"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
            {recurringPlans.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">Nenhum plano recorrente criado ainda.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
