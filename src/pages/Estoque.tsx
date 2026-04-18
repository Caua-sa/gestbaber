import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Package, AlertTriangle, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
}

export default function Estoque() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("name");
    if (data) setProducts(data);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const lowStock = products.filter(p => p.stock <= p.min_stock).length;
  const totalValue = products.reduce((s, p) => s + p.stock * Number(p.sell_price), 0);

  const openCreate = () => {
    setEditing(null);
    setName(""); setCategory(""); setStock(""); setMinStock(""); setSellPrice(""); setCostPrice("");
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setName(p.name); setCategory(p.category); setStock(String(p.stock)); setMinStock(String(p.min_stock));
    setSellPrice(String(p.sell_price)); setCostPrice(String(p.cost_price));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) return;
    const payload: any = {
      name, category, stock: Number(stock), min_stock: Number(minStock),
      sell_price: Number(sellPrice), cost_price: Number(costPrice), active: true,
    };
    if (editing) {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Produto atualizado!");
    } else {
      payload.owner_id = user.id;
      const { error } = await supabase.from("products").insert(payload);
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Produto criado!");
    }
    setDialogOpen(false);
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Produto excluído!");
    fetchProducts();
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display gold-text">Estoque</h1>
          <p className="text-muted-foreground text-sm mt-1">Controle de produtos e insumos</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Adicionar Produto</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total de Produtos" value={String(products.length)} icon={Package} index={0} />
        <StatCard title="Estoque Baixo" value={String(lowStock)} icon={AlertTriangle} index={1} />
        <StatCard title="Valor em Estoque" value={fmt(totalValue)} icon={Package} index={2} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p, i) => {
          const stockPercent = Math.min((p.stock / (p.min_stock * 3 || 1)) * 100, 100);
          const isLow = p.stock <= p.min_stock;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-card border rounded-lg p-4 ${isLow ? "border-destructive/50" : "border-border"}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                </div>
                <div className="flex items-center gap-1">
                  {isLow && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                  <button onClick={() => openEdit(p)} className="p-1 text-muted-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(p.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estoque</span>
                  <span className={`font-medium ${isLow ? "text-destructive" : ""}`}>{p.stock} un</span>
                </div>
                <Progress value={stockPercent} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Mín: {p.min_stock}</span>
                  <span>Venda: {fmt(Number(p.sell_price))}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
        {products.length === 0 && !loading && (
          <p className="text-muted-foreground col-span-3 text-center py-8">Nenhum produto cadastrado.</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nome do produto" value={name} onChange={e => setName(e.target.value)} className="bg-secondary border-border" />
            <Input placeholder="Categoria" value={category} onChange={e => setCategory(e.target.value)} className="bg-secondary border-border" />
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Estoque atual" value={stock} onChange={e => setStock(e.target.value)} className="bg-secondary border-border" />
              <Input type="number" placeholder="Estoque mínimo" value={minStock} onChange={e => setMinStock(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Preço de venda" value={sellPrice} onChange={e => setSellPrice(e.target.value)} className="bg-secondary border-border" />
              <Input type="number" placeholder="Preço de custo" value={costPrice} onChange={e => setCostPrice(e.target.value)} className="bg-secondary border-border" />
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? "Salvar" : "Criar Produto"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
