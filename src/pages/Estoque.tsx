import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Package, AlertTriangle, Plus, Pencil, Trash2, EyeOff, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountOwner } from "@/hooks/useAccountOwner";
import { toast } from "sonner";
import { Construction } from "lucide-react";

const FOOD = ["bebida", "bebidas", "comida", "comidas", "snack", "snacks", "doce", "doces", "lanche", "lanches", "conveniência", "conveniencia", "alimento", "alimentos", "refrigerante", "cerveja", "bala", "balas"];
export const isFood = (c: string) => FOOD.includes((c || "").trim().toLowerCase());

interface Product {
  id: string;
  name: string;
  category: string;
  stock: number;
  min_stock: number;
  sell_price: number;
  cost_price: number;
  sold: number;
  active: boolean;
  visible_on_site: boolean;
}

export default function Estoque() {
  const { user } = useAuth();
  const { ownerId } = useAccountOwner();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [tab, setTab] = useState<"loja" | "conveniencia">("loja");

  const empty = { name: "", category: "", stock: "", minStock: "", sellPrice: "", costPrice: "", visible: true };
  const [form, setForm] = useState(empty);

  const fetchProducts = async () => {
    if (!user || !ownerId) return;
    const { data } = await supabase.from("products").select("*").eq("owner_id", ownerId).order("name");
    if (data) setProducts(data as Product[]);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, [user, ownerId]);

  const list = products.filter(p => tab === "loja" ? p.visible_on_site : !p.visible_on_site);
  const lowStock = list.filter(p => p.stock <= p.min_stock).length;
  const totalValue = list.reduce((s, p) => s + p.stock * Number(p.sell_price), 0);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...empty, visible: tab === "loja", category: tab === "conveniencia" ? "Conveniência" : "" });
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, category: p.category,
      stock: String(p.stock), minStock: String(p.min_stock),
      sellPrice: String(p.sell_price), costPrice: String(p.cost_price),
      visible: p.visible_on_site,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !ownerId) return;
    if (!form.name.trim()) { toast.error("Informe o nome"); return; }
    const payload: any = {
      name: form.name, category: form.category || "Outros",
      stock: Number(form.stock), min_stock: Number(form.minStock),
      sell_price: Number(form.sellPrice), cost_price: Number(form.costPrice),
      visible_on_site: isFood(form.category) ? false : form.visible, active: true,
    };
    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Item atualizado!");
    } else {
      payload.owner_id = ownerId;
      const { error } = await supabase.from("products").insert(payload);
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Item criado!");
    }
    setDialogOpen(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este item?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Item excluído!");
    fetchProducts();
  };

  const toggleVisibility = async (p: Product) => {
    const { error } = await supabase.from("products").update({ visible_on_site: !p.visible_on_site }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    fetchProducts();
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-4xl font-display gold-text">Estoque</h1>
          <p className="text-muted-foreground text-sm mt-1">Produtos da loja e itens de conveniência</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Adicionar Item</Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "loja" | "conveniencia")}>
        <TabsList>
          <TabsTrigger value="loja">Loja (visível no site)</TabsTrigger>
          <TabsTrigger value="conveniencia">Conveniência (uso interno)</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-6 mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Total de Itens" value={String(list.length)} icon={Package} index={0} />
            <StatCard title="Estoque Baixo" value={String(lowStock)} icon={AlertTriangle} index={1} />
            <StatCard title="Valor em Estoque" value={fmt(totalValue)} icon={Package} index={2} />
          </div>

          {tab === "conveniencia" && <h2 className="font-display text-2xl">Produtos da conveniência</h2>}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((p, i) => {
              const stockPercent = Math.min((p.stock / (p.min_stock * 3 || 1)) * 100, 100);
              const isLow = p.stock <= p.min_stock;
              return (
                <motion.div key={p.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                  className={`bg-card border rounded-lg p-4 ${isLow ? "border-destructive/50" : "border-border"}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.category}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {isLow && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                      <button onClick={() => toggleVisibility(p)} title={p.visible_on_site ? "Ocultar do site" : "Mostrar no site"} className="p-1 text-muted-foreground hover:text-primary">
                        {p.visible_on_site ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => openEdit(p)} className="p-1 text-muted-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Estoque</span><span className={`font-medium ${isLow ? "text-destructive" : ""}`}>{p.stock} un</span></div>
                    <Progress value={stockPercent} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground"><span>Mín: {p.min_stock}</span><span>Venda: {fmt(Number(p.sell_price))}</span></div>
                  </div>
                </motion.div>
              );
            })}
            {list.length === 0 && !loading && (<p className="text-muted-foreground col-span-3 text-center py-8">Nenhum item cadastrado.</p>)}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="font-display text-xl">{editing ? "Editar Item" : "Novo Item"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-secondary border-border" />
            <div>
              <Input list="cat-list" placeholder="Categoria (ex: Bebida, Comida, Pomada)" value={form.category}
                onChange={e => { const c = e.target.value; setForm({ ...form, category: c, visible: isFood(c) ? false : form.visible }); }}
                className="bg-secondary border-border" />
              <datalist id="cat-list">
                {Array.from(new Set(["Bebida", "Comida", "Snack", "Doce", ...products.map(p => p.category)])).map(c => <option key={c} value={c} />)}
              </datalist>
              {isFood(form.category) && <p className="text-xs text-primary mt-1">Categoria de comida/bebida: vai automaticamente para a Conveniência.</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Estoque atual" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} className="bg-secondary border-border" />
              <Input type="number" placeholder="Estoque mínimo" value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })} className="bg-secondary border-border" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Preço de venda" value={form.sellPrice} onChange={e => setForm({ ...form, sellPrice: e.target.value })} className="bg-secondary border-border" />
              <Input type="number" placeholder="Preço de custo" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} className="bg-secondary border-border" />
            </div>
            <div className="flex items-center justify-between bg-secondary/50 border border-border rounded-lg p-3">
              <div>
                <Label className="text-sm">Exibir no site</Label>
                <p className="text-xs text-muted-foreground">Desligue para itens de conveniência (uso interno).</p>
              </div>
              <Switch checked={form.visible} onCheckedChange={v => setForm({ ...form, visible: v })} />
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? "Salvar" : "Criar"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
