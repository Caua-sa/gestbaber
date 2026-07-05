import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, TrendingDown, Plus, Pencil, Trash2, Crown, RefreshCw, Ban } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountOwner } from "@/hooks/useAccountOwner";
import { toast } from "sonner";

interface Transaction {
  id: string;
  description: string;
  type: string;
  value: number;
  category: string;
  transaction_date: string;
  notes: string | null;
}

interface SubRow {
  id: string;
  status: string;
  started_at: string | null;
  expires_at: string | null;
  client_name: string;
  plan_name: string;
  plan_price: number;
  mp_status: string | null;
  mp_id: string | null;
  next_payment_date: string | null;
}


const categories = ["Serviço", "Produto", "Fornecedor", "Aluguel", "Salário", "Assinaturas", "Outros"];

export default function Financeiro() {
  const { user } = useAuth();
  const { ownerId } = useAccountOwner();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const [desc, setDesc] = useState("");
  const [type, setType] = useState("entrada");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("Serviço");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");

  const fetchTransactions = async () => {
    if (!ownerId) return;
    const { data } = await supabase.from("transactions").select("*").eq("owner_id", ownerId).order("transaction_date", { ascending: false }).limit(100);
    if (data) setTransactions(data);
    setLoading(false);
  };

  const fetchSubs = async () => {
    if (!ownerId) return;
    setLoadingSubs(true);
    const { data: shop } = await supabase.from("barbershops").select("id").eq("owner_id", ownerId).maybeSingle();
    const bId = shop?.id;
    const q = supabase
      .from("subscriptions")
      .select("id, status, started_at, expires_at, user_id, plan:plans(name, price)")
      .order("started_at", { ascending: false })
      .limit(100);
    const { data } = bId ? await q.eq("barbershop_id", bId) : await q;
    if (!data) { setSubs([]); setLoadingSubs(false); return; }
    const userIds = Array.from(new Set(data.map((s: any) => s.user_id).filter(Boolean)));
    const subIds = data.map((s: any) => s.id);
    const [{ data: profs }, { data: mps }] = await Promise.all([
      userIds.length ? supabase.from("profiles").select("user_id, full_name").in("user_id", userIds) : Promise.resolve({ data: [] as any[] }),
      subIds.length ? supabase.from("mp_subscriptions").select("id, subscription_id, status, next_payment_date").in("subscription_id", subIds) : Promise.resolve({ data: [] as any[] }),
    ]);

    const profMap = new Map((profs || []).map((p: any) => [p.user_id, p.full_name]));
    const mpMap = new Map((mps || []).map((m: any) => [m.subscription_id, m]));
    setSubs(data.map((s: any) => {
      const mp = mpMap.get(s.id);
      return {
        id: s.id,
        status: s.status,
        started_at: s.started_at,
        expires_at: s.expires_at,
        client_name: profMap.get(s.user_id) || "Cliente",
        plan_name: s.plan?.name || "-",
        plan_price: Number(s.plan?.price || 0),
        mp_status: mp?.status || null,
        mp_id: mp?.id || null,
        next_payment_date: mp?.next_payment_date || null,
      };
    }));

    setLoadingSubs(false);
  };

  useEffect(() => {
    fetchTransactions();
    fetchSubs();
    if (!ownerId) return;
    const ch = supabase
      .channel(`fin-subs-${ownerId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, () => { fetchSubs(); fetchTransactions(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "mp_subscriptions" }, () => { fetchSubs(); fetchTransactions(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => fetchTransactions())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ownerId]);

  const totalReceita = transactions.filter(t => t.type === "entrada").reduce((s, t) => s + Number(t.value), 0);
  const totalDespesas = transactions.filter(t => t.type === "saída").reduce((s, t) => s + Number(t.value), 0);
  const lucro = totalReceita - totalDespesas;

  const openCreate = () => {
    setEditing(null);
    setDesc(""); setType("entrada"); setValue(""); setCategory("Serviço"); setDate(new Date().toISOString().split("T")[0]); setNotes("");
    setDialogOpen(true);
  };

  const openEdit = (t: Transaction) => {
    setEditing(t);
    setDesc(t.description); setType(t.type); setValue(String(t.value)); setCategory(t.category); setDate(t.transaction_date); setNotes(t.notes || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !ownerId) return;
    const payload: any = { description: desc, type, value: Number(value), category, transaction_date: date, notes: notes || null };
    if (editing) {
      const { error } = await supabase.from("transactions").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Transação atualizada!");
    } else {
      payload.owner_id = ownerId;
      payload.created_by = user.id;
      const { error } = await supabase.from("transactions").insert(payload);
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Transação criada!");
    }
    setDialogOpen(false);
    fetchTransactions();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Transação excluída!");
    fetchTransactions();
  };
  const handleCancelSub = async (mpId: string, clientName: string) => {
    if (!confirm(`Cancelar a assinatura de ${clientName}? O acesso segue válido até o fim do período.`)) return;
    try {
      const { data, error } = await supabase.functions.invoke("mp-cancel-subscription", {
        body: { mp_subscription_id: mpId, mode: "end_of_cycle" },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success("Assinatura cancelada");
      fetchSubs();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cancelar");
    }
  };


  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display gold-text">Financeiro</h1>
          <p className="text-muted-foreground text-sm mt-1">Receitas, despesas e fluxo de caixa</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nova Transação</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Receita Total" value={fmt(totalReceita)} icon={TrendingUp} index={0} />
        <StatCard title="Despesas" value={fmt(totalDespesas)} icon={TrendingDown} index={1} />
        <StatCard title="Lucro Líquido" value={fmt(lucro)} icon={DollarSign} index={2} />
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl tracking-wide flex items-center gap-2">
            <Crown className="h-4 w-4 text-primary" /> Assinaturas dos Clientes
          </h2>
          <button onClick={fetchSubs} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
            <RefreshCw className={`h-3 w-3 ${loadingSubs ? "animate-spin" : ""}`} /> Atualizar
          </button>
        </div>
        {loadingSubs ? (
          <p className="text-muted-foreground text-center py-6 text-sm">Carregando assinaturas...</p>
        ) : subs.length === 0 ? (
          <p className="text-muted-foreground text-center py-6 text-sm">Nenhuma assinatura ainda.</p>
        ) : (
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {subs.map((s, i) => {
              const paid = s.status === "pago" || s.mp_status === "authorized";
              const canceled = s.status === "cancelado" || s.mp_status === "cancelled";
              const nextDate = s.next_payment_date || s.expires_at;
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center justify-between py-2.5 px-3 border-b border-border/50 last:border-0 hover:bg-secondary/30 rounded"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{s.client_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.plan_name}
                      {s.started_at && <> • início {new Date(s.started_at).toLocaleDateString("pt-BR")}</>}
                      {nextDate && <> • próx. {new Date(nextDate).toLocaleDateString("pt-BR")}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-medium">{fmt(s.plan_price)}</span>
                    <Badge
                      variant="outline"
                      className={
                        canceled ? "border-destructive/40 text-destructive"
                        : paid ? "border-success/40 text-success"
                        : "border-primary/40 text-primary"
                      }
                    >
                      {canceled ? "cancelado" : paid ? "pago" : "pendente"}
                    </Badge>
                    {!canceled && s.mp_id && (
                      <button
                        onClick={() => handleCancelSub(s.mp_id!, s.client_name)}
                        className="p-1 text-muted-foreground hover:text-destructive"
                        title="Cancelar assinatura"
                      >
                        <Ban className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="font-display text-xl mb-4 tracking-wide">Transações</h2>
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Carregando...</p>
        ) : transactions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhuma transação cadastrada.</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between py-3 px-3 border-b border-border/50 last:border-0 hover:bg-secondary/30 rounded transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{t.description}</p>
                  <p className="text-xs text-muted-foreground">{t.category} • {new Date(t.transaction_date + "T00:00:00").toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`font-medium text-sm ${t.type === "entrada" ? "text-success" : "text-destructive"}`}>
                    {t.type === "entrada" ? "+" : "-"}{fmt(Number(t.value))}
                  </span>
                  <button onClick={() => openEdit(t)} className="p-1 text-muted-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(t.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{editing ? "Editar Transação" : "Nova Transação"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Descrição" value={desc} onChange={e => setDesc(e.target.value)} className="bg-secondary border-border" />
            <div className="grid grid-cols-2 gap-3">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saída">Saída</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" placeholder="Valor" value={value} onChange={e => setValue(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-secondary border-border" />
            </div>
            <Input placeholder="Observações (opcional)" value={notes} onChange={e => setNotes(e.target.value)} className="bg-secondary border-border" />
            <Button onClick={handleSave} className="w-full">{editing ? "Salvar" : "Criar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
