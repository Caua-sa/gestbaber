import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Boxes, AlertTriangle, Plus, Pencil, Trash2, Search, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountOwner } from "@/hooks/useAccountOwner";
import { toast } from "sonner";

interface Insumo {
  id: string;
  name: string;
  unit: string;
  stock: number;
  min_stock: number;
  cost_price: number;
  supplier: string | null;
  notes: string | null;
  active: boolean;
}

const UNITS = ["un", "ml", "L", "g", "kg", "cx", "pct"];

export default function AdminInsumos() {
  const { user } = useAuth();
  const { ownerId } = useAccountOwner();
  const [items, setItems] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Insumo | null>(null);
  const [search, setSearch] = useState("");

  const empty = { name: "", unit: "un", stock: "0", min_stock: "0", cost_price: "0", supplier: "", notes: "" };
  const [form, setForm] = useState(empty);

  const fetchAll = async () => {
    if (!user || !ownerId) return;
    const { data } = await supabase.from("insumos").select("*").eq("owner_id", ownerId).order("name");
    setItems((data || []) as Insumo[]);
    setLoading(false);
  };
  useEffect(() => { fetchAll(); }, [user, ownerId]);

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (i: Insumo) => {
    setEditing(i);
    setForm({
      name: i.name, unit: i.unit, stock: String(i.stock), min_stock: String(i.min_stock),
      cost_price: String(i.cost_price), supplier: i.supplier || "", notes: i.notes || "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!user || !ownerId || !form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    const payload: any = {
      name: form.name.trim(),
      unit: form.unit,
      stock: Number(form.stock) || 0,
      min_stock: Number(form.min_stock) || 0,
      cost_price: Number(form.cost_price) || 0,
      supplier: form.supplier || null,
      notes: form.notes || null,
    };
    const { error } = editing
      ? await supabase.from("insumos").update(payload).eq("id", editing.id)
      : await supabase.from("insumos").insert({ ...payload, owner_id: ownerId });
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Insumo atualizado" : "Insumo cadastrado");
    setOpen(false);
    fetchAll();
  };

  const adjustStock = async (i: Insumo, delta: number) => {
    const newStock = Math.max(0, Number(i.stock) + delta);
    const { error } = await supabase.from("insumos").update({ stock: newStock }).eq("id", i.id);
    if (error) { toast.error(error.message); return; }
    setItems((prev) => prev.map((x) => x.id === i.id ? { ...x, stock: newStock } : x));
    toast.success(`${i.name}: ${newStock} ${i.unit}`);
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este insumo?")) return;
    const { error } = await supabase.from("insumos").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Removido");
    fetchAll();
  };

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return items;
    return items.filter(i =>
      i.name.toLowerCase().includes(t) ||
      (i.supplier || "").toLowerCase().includes(t),
    );
  }, [items, search]);

  const lowStock = items.filter(i => Number(i.stock) <= Number(i.min_stock)).length;
  const totalCost = items.reduce((s, i) => s + Number(i.stock) * Number(i.cost_price), 0);
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-4xl font-display gold-text">Insumos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Controle interno de materiais — não aparece no site nem para clientes.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Novo Insumo</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total de Insumos" value={String(items.length)} icon={Boxes} index={0} />
        <StatCard title="Estoque Baixo" value={String(lowStock)} icon={AlertTriangle} index={1} />
        <StatCard title="Valor Investido" value={fmt(totalCost)} icon={Boxes} index={2} />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por nome ou fornecedor"
          className="bg-secondary border-border pl-9"
        />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left p-3">Insumo</th>
              <th className="text-left p-3 hidden md:table-cell">Fornecedor</th>
              <th className="text-center p-3">Baixa rápida</th>
              <th className="text-right p-3">Estoque</th>
              <th className="text-right p-3 hidden md:table-cell">Mín</th>
              <th className="text-right p-3 hidden md:table-cell">Custo</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i, idx) => {
              const low = Number(i.stock) <= Number(i.min_stock);
              return (
                <motion.tr key={i.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                  className={`border-t border-border ${low ? "bg-destructive/5" : ""}`}>
                  <td className="p-3">
                    <p className="font-medium flex items-center gap-2">
                      {i.name}
                      {low && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                    </p>
                    <p className="text-xs text-muted-foreground">{i.unit}</p>
                  </td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">{i.supplier || "—"}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => adjustStock(i, -1)} disabled={Number(i.stock) <= 0}>
                        <Minus className="h-3 w-3" />1
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => adjustStock(i, -5)} disabled={Number(i.stock) <= 0}>
                        <Minus className="h-3 w-3" />5
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-success" onClick={() => adjustStock(i, +1)}>
                        <Plus className="h-3 w-3" />1
                      </Button>
                    </div>
                  </td>
                  <td className="p-3 text-right font-medium">{Number(i.stock)} {i.unit}</td>
                  <td className="p-3 text-right text-muted-foreground hidden md:table-cell">{Number(i.min_stock)}</td>
                  <td className="p-3 text-right hidden md:table-cell">{fmt(Number(i.cost_price))}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(i)} className="p-1 text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => remove(i.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </motion.tr>
              );
            })}
            {filtered.length === 0 && !loading && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">
                {items.length === 0 ? "Nenhum insumo cadastrado." : "Nada encontrado para a busca."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="font-display text-xl">{editing ? "Editar Insumo" : "Novo Insumo"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nome do insumo *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-secondary border-border" />
            <div className="grid grid-cols-2 gap-3">
              <Select value={form.unit} onValueChange={v => setForm({ ...form, unit: v })}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Fornecedor" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} className="bg-secondary border-border" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input type="number" step="0.01" placeholder="Estoque" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} className="bg-secondary border-border" />
              <Input type="number" step="0.01" placeholder="Mínimo" value={form.min_stock} onChange={e => setForm({ ...form, min_stock: e.target.value })} className="bg-secondary border-border" />
              <Input type="number" step="0.01" placeholder="Custo unit." value={form.cost_price} onChange={e => setForm({ ...form, cost_price: e.target.value })} className="bg-secondary border-border" />
            </div>
            <Textarea placeholder="Observações" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="bg-secondary border-border" rows={2} />
            <Button onClick={save} className="w-full">{editing ? "Salvar" : "Cadastrar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
