import { useState, useEffect, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, TrendingDown, Plus, Pencil, Trash2, Crown, RefreshCw, Ban, Search, Percent, Receipt, ArrowUpRight, ArrowDownRight } from "lucide-react";
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
    const { data } = await supabase.from("transactions").select("*").eq("owner_id", ownerId).order("transaction_date", { ascending: false }).limit(2000);
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

  const [period, setPeriod] = useState<"mes" | "anterior" | "30" | "ano" | "tudo">("mes");
  const [typeFilter, setTypeFilter] = useState<"todos" | "entrada" | "saída">("todos");
  const [search, setSearch] = useState("");

  const range = useMemo(() => {
    const now = new Date(); const iso = (d: Date) => d.toISOString().slice(0, 10);
    const len = (a: Date, b: Date) => b.getTime() - a.getTime();
    let start: Date, end = new Date(now);
    if (period === "mes") start = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (period === "anterior") { start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0); }
    else if (period === "30") { start = new Date(now); start.setDate(start.getDate() - 29); }
    else if (period === "ano") start = new Date(now.getFullYear(), 0, 1);
    else return { from: "0000-01-01", to: "9999-12-31", prevFrom: "", prevTo: "" };
    const prevEnd = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1);
    const prevStart = new Date(prevEnd.getTime() - len(start, end));
    return { from: iso(start), to: iso(end), prevFrom: iso(prevStart), prevTo: iso(prevEnd) };
  }, [period]);

  const inRange = transactions.filter(t => t.transaction_date >= range.from && t.transaction_date <= range.to);
  const prevRange = range.prevFrom ? transactions.filter(t => t.transaction_date >= range.prevFrom && t.transaction_date <= range.prevTo) : [];
  const sum = (arr: Transaction[], ty: string) => arr.filter(t => t.type === ty).reduce((s, t) => s + Number(t.value), 0);
  const totalReceita = sum(inRange, "entrada");
  const totalDespesas = sum(inRange, "saída");
  const lucro = totalReceita - totalDespesas;
  const prevReceita = sum(prevRange, "entrada");
  const prevLucro = prevReceita - sum(prevRange, "saída");
  const margem = totalReceita > 0 ? (lucro / totalReceita) * 100 : 0;
  const nEntradas = inRange.filter(t => t.type === "entrada").length;
  const ticket = nEntradas ? totalReceita / nEntradas : 0;
  const delta = (cur: number, prev: number) => (prev ? ((cur - prev) / Math.abs(prev)) * 100 : null);
  const mrr = subs.filter(s => !(s.status === "cancelado" || s.mp_status === "cancelled")).reduce((a, s) => a + s.plan_price, 0);

  const chartData = useMemo(() => {
    const map = new Map<string, { d: string; entrada: number; saida: number }>();
    [...inRange].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date)).forEach(t => {
      const key = period === "ano" || period === "tudo" ? t.transaction_date.slice(0, 7) : t.transaction_date;
      const row = map.get(key) || { d: key, entrada: 0, saida: 0 };
      if (t.type === "entrada") row.entrada += Number(t.value); else row.saida += Number(t.value);
      map.set(key, row);
    });
    return Array.from(map.values()).map(r => ({ ...r, label: r.d.length === 7 ? `${r.d.slice(5)}/${r.d.slice(2, 4)}` : `${r.d.slice(8)}/${r.d.slice(5, 7)}` }));
  }, [inRange, period]);

  const byCategory = (ty: string) => {
    const m = new Map<string, number>();
    inRange.filter(t => t.type === ty).forEach(t => m.set(t.category || "Outros", (m.get(t.category || "Outros") || 0) + Number(t.value)));
    const total = Array.from(m.values()).reduce((a, b) => a + b, 0) || 1;
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).map(([name, v]) => ({ name, v, pct: (v / total) * 100 }));
  };
  const catIn = byCategory("entrada");
  const catOut = byCategory("saída");

  const visible = inRange.filter(t =>
    (typeFilter === "todos" || t.type === typeFilter) &&
    (!search.trim() || `${t.description} ${t.category} ${t.notes || ""}`.toLowerCase().includes(search.trim().toLowerCase())));

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-4xl font-display gold-text">Financeiro</h1>
          <p className="text-muted-foreground text-sm mt-1">Receitas, despesas e fluxo de caixa</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-[170px] bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Este mês</SelectItem>
              <SelectItem value="anterior">Mês passado</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="ano">Este ano</SelectItem>
              <SelectItem value="tudo">Tudo</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Nova Transação</Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-6">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Lucro líquido no período</p>
        <div className="flex items-end gap-4 flex-wrap mt-1">
          <span className={`font-display text-5xl ${lucro >= 0 ? "gold-text" : "text-destructive"}`}>{fmt(lucro)}</span>
          {delta(lucro, prevLucro) !== null && (
            <span className={`flex items-center gap-1 text-sm mb-2 ${delta(lucro, prevLucro)! >= 0 ? "text-success" : "text-destructive"}`}>
              {delta(lucro, prevLucro)! >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {Math.abs(delta(lucro, prevLucro)!).toFixed(0)}% vs período anterior
            </span>
          )}
        </div>
        <div className="mt-4 h-2 rounded-full bg-secondary overflow-hidden flex">
          <div className="bg-success h-full transition-all" style={{ width: `${totalReceita + totalDespesas ? (totalReceita / (totalReceita + totalDespesas)) * 100 : 50}%` }} />
          <div className="bg-destructive h-full flex-1" />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
          <span>Entradas {fmt(totalReceita)}</span><span>Saídas {fmt(totalDespesas)}</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Receita" value={fmt(totalReceita)} icon={TrendingUp} index={0} />
        <StatCard title="Despesas" value={fmt(totalDespesas)} icon={TrendingDown} index={1} />
        <StatCard title="Margem" value={`${margem.toFixed(1)}%`} icon={Percent} index={2} />
        <StatCard title="Ticket médio" value={fmt(ticket)} icon={Receipt} index={3} />
        <StatCard title="Assinaturas/mês" value={fmt(mrr)} icon={Crown} index={4} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h2 className="font-display text-xl tracking-wide mb-4">Fluxo de caixa</h2>
          {chartData.length === 0 ? (
            <p className="text-muted-foreground text-center py-16 text-sm">Sem movimentações no período.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.5} /><stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} /></linearGradient>
                    <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} /><stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} width={60} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => fmt(v)} />
                  <Area type="monotone" dataKey="entrada" name="Entradas" stroke="hsl(var(--success))" fill="url(#gIn)" strokeWidth={2} />
                  <Area type="monotone" dataKey="saida" name="Saídas" stroke="hsl(var(--destructive))" fill="url(#gOut)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-5 space-y-5">
          {[{ t: "De onde vem o dinheiro", d: catIn, c: "bg-success" }, { t: "Para onde vai", d: catOut, c: "bg-destructive" }].map(g => (
            <div key={g.t}>
              <h3 className="font-display text-lg tracking-wide mb-2">{g.t}</h3>
              {g.d.length === 0 ? <p className="text-xs text-muted-foreground">Nada no período.</p> : g.d.slice(0, 5).map(c => (
                <div key={c.name} className="mb-2">
                  <div className="flex justify-between text-xs mb-1"><span>{c.name}</span><span className="text-muted-foreground">{fmt(c.v)} · {c.pct.toFixed(0)}%</span></div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${c.pct}%` }} className={`h-full ${g.c}`} /></div>
                </div>
              ))}
            </div>
          ))}
        </div>
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
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <h2 className="font-display text-xl tracking-wide">Transações <span className="text-sm text-muted-foreground font-sans">({visible.length})</span></h2>
          <div className="flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="pl-8 h-9 w-44 bg-secondary border-border" />
            </div>
            {(["todos", "entrada", "saída"] as const).map(f => (
              <Button key={f} size="sm" variant={typeFilter === f ? "default" : "outline"} onClick={() => setTypeFilter(f)} className="h-9 capitalize">{f === "todos" ? "Todos" : f === "entrada" ? "Entradas" : "Saídas"}</Button>
            ))}
          </div>
        </div>
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Carregando...</p>
        ) : visible.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhuma transação neste filtro.</p>
        ) : (
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {visible.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i, 15) * 0.03 }}
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
