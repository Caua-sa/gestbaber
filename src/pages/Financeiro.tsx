import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, TrendingDown, Plus, Pencil, Trash2 } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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

const categories = ["Serviço", "Produto", "Fornecedor", "Aluguel", "Salário", "Assinaturas", "Outros"];

export default function Financeiro() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
    const { data } = await supabase.from("transactions").select("*").order("transaction_date", { ascending: false }).limit(100);
    if (data) setTransactions(data);
    setLoading(false);
  };

  useEffect(() => { fetchTransactions(); }, []);

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
    if (!user) return;
    const payload: any = { description: desc, type, value: Number(value), category, transaction_date: date, notes: notes || null };
    if (editing) {
      const { error } = await supabase.from("transactions").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Transação atualizada!");
    } else {
      payload.owner_id = user.id;
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
