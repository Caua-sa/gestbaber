import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Crown, Users, Check, Star, Plus, Pencil, Trash2, Filter, CalendarClock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/StatCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  popular: boolean;
  active: boolean;
  barbershop_id?: string | null;
}

type SubFilter = "todos" | "pagos" | "a_pagar" | "vencidos";

interface SubscriberRow {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  client_name: string;
  plan_name: string;
  plan_price: number;
}

export default function Assinaturas() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [subscribers, setSubscribers] = useState<SubscriberRow[]>([]);
  const [subFilter, setSubFilter] = useState<SubFilter>("todos");
  const [clientSearch, setClientSearch] = useState("");
  const [shopId, setShopId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [period, setPeriod] = useState("mês");
  const [features, setFeatures] = useState("");
  const [popular, setPopular] = useState(false);

  const fetchPlans = async () => {
    const query = user ? supabase.from("plans").select("*").eq("owner_id", user.id).order("price") : supabase.from("plans").select("*").order("price");
    const { data } = await query;
    if (data) setPlans(data.map(p => ({ ...p, features: (p.features as any) || [] })));
    setLoading(false);
  };

  const fetchSubscribers = async () => {
    if (!user) return;
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("id,user_id,plan_id,status,started_at,expires_at,barbershop_id")
      .order("created_at", { ascending: false })
      .limit(100);

    const planIds = [...new Set((subs || []).map((s) => s.plan_id).filter(Boolean))];
    const userIds = [...new Set((subs || []).map((s) => s.user_id).filter(Boolean))];

    const [{ data: planRows }, { data: profileRows }] = await Promise.all([
      planIds.length ? supabase.from("plans").select("id,name,price,owner_id").in("id", planIds) : Promise.resolve({ data: [] } as any),
      userIds.length ? supabase.from("profiles").select("user_id,full_name").in("user_id", userIds) : Promise.resolve({ data: [] } as any),
    ]);

    const planMap = new Map((planRows || []).map((p: any) => [p.id, p]));
    const profileMap = new Map((profileRows || []).map((p: any) => [p.user_id, p]));
    setSubscribers((subs || []).map((sub: any) => {
      const plan = planMap.get(sub.plan_id) as any;
      const profile = profileMap.get(sub.user_id) as any;
      return {
        ...sub,
        client_name: profile?.full_name || "Cliente cadastrado",
        plan_name: plan?.name || "Plano removido",
        plan_price: Number(plan?.price || 0),
      };
    }));
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("barbershops").select("id").eq("owner_id", user.id).maybeSingle();
      setShopId(data?.id || null);
      fetchPlans();
      fetchSubscribers();
    })();
  }, [user]);

  const openCreate = () => {
    setEditingPlan(null);
    setName(""); setPrice(""); setPeriod("mês"); setFeatures(""); setPopular(false);
    setDialogOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setPrice(String(plan.price));
    setPeriod(plan.period);
    setFeatures(plan.features.join("\n"));
    setPopular(plan.popular);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    const featuresArr = features.split("\n").map(f => f.trim()).filter(Boolean);
    const payload: any = {
      name,
      price: Number(price),
      period,
      features: featuresArr,
      popular,
      active: true,
    };

    if (editingPlan) {
      const { error } = await supabase.from("plans").update(payload).eq("id", editingPlan.id);
      if (error) { toast.error("Erro ao atualizar plano"); return; }
      toast.success("Plano atualizado!");
    } else {
      payload.owner_id = user.id;
      payload.barbershop_id = shopId;
      const { error } = await supabase.from("plans").insert(payload);
      if (error) { toast.error("Erro ao criar plano"); return; }
      toast.success("Plano criado!");
    }
    setDialogOpen(false);
    fetchPlans();
  };

  const updateSubscriberStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("subscriptions").update({ status }).eq("id", id);
    if (error) return toast.error("Erro ao atualizar assinatura");
    toast.success("Assinatura atualizada!");
    fetchSubscribers();
  };

  const deleteSubscriber = async (id: string) => {
    if (!confirm("Apagar esta assinatura do cliente?")) return;
    const { error } = await supabase.from("subscriptions").delete().eq("id", id);
    if (error) return toast.error("Erro ao apagar assinatura");
    toast.success("Assinatura apagada!");
    fetchSubscribers();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir plano"); return; }
    toast.success("Plano excluído!");
    fetchPlans();
  };

  const isExpired = (s: SubscriberRow) => !!s.expires_at && new Date(s.expires_at) < new Date() && s.status !== "ativo";
  const filteredSubscribers = subscribers.filter((s) => {
    const term = clientSearch.trim().toLowerCase();
    const byClient = !term || s.client_name.toLowerCase().includes(term) || s.plan_name.toLowerCase().includes(term);
    if (!byClient) return false;
    if (subFilter === "pagos") return s.status === "ativo";
    if (subFilter === "a_pagar") return ["pendente", "a_pagar"].includes(s.status);
    if (subFilter === "vencidos") return isExpired(s) || s.status === "vencido";
    return true;
  });
  const activeSubscribers = subscribers.filter(s => s.status === "ativo").length;
  const pendingSubscribers = subscribers.filter(s => ["pendente", "a_pagar"].includes(s.status)).length;
  const expiredSubscribers = subscribers.filter(isExpired).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display gold-text">Assinaturas</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie planos e assinantes</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Plano
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Assinantes Ativos" value={String(activeSubscribers)} icon={Users} index={0} />
        <StatCard title="A Pagar" value={String(pendingSubscribers)} icon={CreditCard} index={1} />
        <StatCard title="Vencidos" value={String(expiredSubscribers)} icon={CalendarClock} index={2} />
        <StatCard title="Total de Planos" value={String(plans.length)} icon={Crown} index={3} />
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`bg-card border-2 ${plan.popular ? "border-primary card-glow" : "border-border"} rounded-lg p-6 relative`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 gold-gradient text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
                Mais popular
              </span>
            )}
            <div className="flex items-start justify-between">
              <h3 className="font-display text-2xl tracking-wide">{plan.name}</h3>
              <div className="flex gap-1">
                <button onClick={() => openEdit(plan)} className="p-1 text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(plan.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="mt-2 mb-4">
              <span className="text-3xl font-bold">R$ {plan.price}</span>
              <span className="text-muted-foreground text-sm">/{plan.period}</span>
            </div>
            <ul className="space-y-2 mb-6">
              {plan.features.map((f: string) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
        {plans.length === 0 && !loading && (
          <p className="text-muted-foreground col-span-3 text-center py-8">Nenhum plano cadastrado. Clique em "Novo Plano" para criar.</p>
        )}
      </div>

      {/* Subscribers table */}
      <div className="bg-card border border-border rounded-lg p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
            <h2 className="font-display text-xl tracking-wide flex items-center gap-2"><Filter className="h-4 w-4 text-primary" /> Assinantes</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Filtrar por cliente ou plano"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                className="bg-secondary border-border sm:w-64"
              />
              <div className="flex gap-1 rounded-md border border-border bg-secondary p-1">
                {([
                  ["todos", "Todos"],
                  ["pagos", "Pagos"],
                  ["a_pagar", "A pagar"],
                  ["vencidos", "Vencidos"],
                ] as [SubFilter, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setSubFilter(value)}
                    className={`px-3 py-1.5 text-xs rounded-sm transition-colors ${subFilter === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-3 px-2 font-medium">Cliente</th>
                  <th className="text-left py-3 px-2 font-medium">Plano</th>
                  <th className="text-left py-3 px-2 font-medium">Valor</th>
                  <th className="text-left py-3 px-2 font-medium">Início</th>
                  <th className="text-left py-3 px-2 font-medium">Vencimento</th>
                  <th className="text-left py-3 px-2 font-medium">Status</th>
                  <th className="text-right py-3 px-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscribers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum assinante encontrado.</td>
                  </tr>
                ) : filteredSubscribers.map((sub) => (
                  <tr key={sub.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="py-3 px-2 font-medium">{sub.client_name}</td>
                    <td className="py-3 px-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{sub.plan_name}</span>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">{sub.plan_price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                    <td className="py-3 px-2 text-muted-foreground">{new Date(sub.started_at).toLocaleDateString("pt-BR")}</td>
                    <td className="py-3 px-2 text-muted-foreground">{sub.expires_at ? new Date(sub.expires_at).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="py-3 px-2">
                      <select
                        value={sub.status}
                        onChange={(e) => updateSubscriberStatus(sub.id, e.target.value)}
                        className={`text-xs px-2 py-1 rounded-full border border-border bg-secondary ${sub.status === "ativo" ? "text-success" : sub.status === "pendente" ? "text-primary" : "text-destructive"}`}
                      >
                        <option value="ativo">pago</option>
                        <option value="pendente">a pagar</option>
                        <option value="vencido">vencido</option>
                        <option value="cancelado">cancelado</option>
                      </select>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteSubscriber(sub.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{editingPlan ? "Editar Plano" : "Novo Plano"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nome do plano" value={name} onChange={e => setName(e.target.value)} className="bg-secondary border-border" />
            <Input type="number" placeholder="Preço (ex: 79)" value={price} onChange={e => setPrice(e.target.value)} className="bg-secondary border-border" />
            <Input placeholder="Período (ex: mês)" value={period} onChange={e => setPeriod(e.target.value)} className="bg-secondary border-border" />
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Benefícios (um por linha)</label>
              <textarea
                value={features}
                onChange={e => setFeatures(e.target.value)}
                rows={4}
                className="w-full rounded-md bg-secondary border border-border px-3 py-2 text-sm"
                placeholder={"2 cortes por mês\nDesconto de 10%\nAgendamento prioritário"}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={popular} onCheckedChange={setPopular} />
              <span className="text-sm text-muted-foreground">Marcar como mais popular</span>
            </div>
            <Button onClick={handleSave} className="w-full">{editingPlan ? "Salvar Alterações" : "Criar Plano"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
