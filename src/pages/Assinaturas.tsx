import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Crown, Users, Check, Star, Plus, Pencil, Trash2 } from "lucide-react";
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
}

export default function Assinaturas() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [subscribers, setSubscribers] = useState<any[]>([]);

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
    const { data } = await supabase
      .from("subscriptions")
      .select("*, plans(name), profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setSubscribers(data);
  };

  useEffect(() => { if (user) { fetchPlans(); fetchSubscribers(); } }, [user]);

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
      const { error } = await supabase.from("plans").insert(payload);
      if (error) { toast.error("Erro ao criar plano"); return; }
      toast.success("Plano criado!");
    }
    setDialogOpen(false);
    fetchPlans();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir plano"); return; }
    toast.success("Plano excluído!");
    fetchPlans();
  };

  const activeSubscribers = subscribers.filter(s => s.status === "ativo").length;

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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Assinantes Ativos" value={String(activeSubscribers)} icon={Users} index={0} />
        <StatCard title="Total de Planos" value={String(plans.length)} icon={Crown} index={1} />
        <StatCard title="Plano Mais Popular" value={plans.find(p => p.popular)?.name || "—"} icon={Star} index={2} />
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
      {subscribers.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="font-display text-xl mb-4 tracking-wide">Assinantes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-3 px-2 font-medium">Cliente</th>
                  <th className="text-left py-3 px-2 font-medium">Plano</th>
                  <th className="text-left py-3 px-2 font-medium">Início</th>
                  <th className="text-left py-3 px-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((sub) => (
                  <tr key={sub.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="py-3 px-2 font-medium">{(sub.profiles as any)?.full_name || "—"}</td>
                    <td className="py-3 px-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{(sub.plans as any)?.name || "—"}</span>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground">{new Date(sub.started_at).toLocaleDateString("pt-BR")}</td>
                    <td className="py-3 px-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${sub.status === "ativo" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{sub.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
