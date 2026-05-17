import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, Smartphone, Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Product {
  id: string;
  name: string;
  category: string;
  stock: number;
  sell_price: number;
  cost_price: number;
  active: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Sale {
  id: string;
  total: number;
  payment_method: string;
  sale_type: string;
  created_at: string;
  items_count: number;
}

const paymentMethods = [
  { value: "dinheiro", label: "Dinheiro", icon: Banknote },
  { value: "cartao", label: "Cartão", icon: CreditCard },
  { value: "pix", label: "PIX", icon: Smartphone },
  { value: "mercadopago", label: "Merc. Pago", icon: CreditCard },
];

export default function Vendas() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("dinheiro");
  const [saleType, setSaleType] = useState("fisico");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [mpLink, setMpLink] = useState<string | null>(null);

  const fetchProducts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("owner_id", user.id)
      .eq("active", true)
      .order("name");
    if (data) setProducts(data);
    setLoading(false);
  };

  const fetchRecentSales = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("owner_id", user.id)
      .eq("category", "Venda")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) {
      setRecentSales(data.map(t => ({
        id: t.id,
        total: Number(t.value),
        payment_method: t.notes?.split("|")[0] || "—",
        sale_type: t.notes?.split("|")[1] || "—",
        created_at: t.created_at,
        items_count: parseInt(t.notes?.split("|")[2] || "0"),
      })));
    }
  };

  useEffect(() => { if (user) { fetchProducts(); fetchRecentSales(); } }, [user]);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error("Estoque insuficiente");
          return prev;
        }
        return prev.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      if (product.stock <= 0) {
        toast.error("Produto sem estoque");
        return prev;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.product.id !== productId) return c;
      const newQty = c.quantity + delta;
      if (newQty <= 0) return c;
      if (newQty > c.product.stock) { toast.error("Estoque insuficiente"); return c; }
      return { ...c, quantity: newQty };
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(c => c.product.id !== productId));
  };

  const total = cart.reduce((s, c) => s + c.quantity * Number(c.product.sell_price), 0);
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const finalizeSale = async () => {
    if (cart.length === 0 || !user) return;
    setProcessing(true);
    try {
      const itemNames = cart.map(c => `${c.quantity}x ${c.product.name}`).join(", ");
      const productIds = cart.map(c => c.product.id).join(",");

      const { error: txError } = await supabase.from("transactions").insert({
        description: `Venda: ${itemNames}`,
        type: "entrada",
        value: total,
        category: "Venda",
        transaction_date: new Date().toISOString().split("T")[0],
        notes: `${paymentMethod}|${saleType}|${cart.reduce((s, c) => s + c.quantity, 0)}|${productIds}`,
        owner_id: user.id,
      });
      if (txError) throw txError;

      for (const item of cart) {
        const { error } = await supabase
          .from("products")
          .update({
            stock: item.product.stock - item.quantity,
            sold: (item.product as any).sold + item.quantity,
          })
          .eq("id", item.product.id);
        if (error) throw error;
      }

      // If Mercado Pago, create payment link
      if (paymentMethod === "mercadopago" && user) {
        const { data, error } = await supabase.functions.invoke("mp-create-payment", {
          body: {
            amount: total,
            description: `Venda PDV: ${itemNames}`.slice(0, 200),
            admin_user_id: user.id,
            source: "pdv",
          },
        });
        if (error || !data?.init_point) {
          toast.error("Venda registrada, mas falhou ao gerar link MP. Configure suas credenciais em Mercado Pago.");
        } else {
          setMpLink(data.init_point);
          window.open(data.init_point, "_blank");
        }
      }

      toast.success("Venda finalizada com sucesso!");
      setCart([]);
      setConfirmOpen(false);
      fetchProducts();
      fetchRecentSales();
    } catch (err) {
      toast.error("Erro ao finalizar venda");
    } finally {
      setProcessing(false);
    }
  };

  const deleteSale = async (saleId: string) => {
    try {
      // Fetch sale to know what to revert
      const { data: tx } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", saleId)
        .single();

      if (!tx) throw new Error("Venda não encontrada");

      // Parse items from notes (format: payment|type|qty|productIds OR description "Venda: 2x Pomada, 1x Shampoo")
      const parts = (tx.notes || "").split("|");
      const productIds = (parts[3] || "").split(",").filter(Boolean);

      // Parse "Venda: 2x Name, 1x Name" from description
      const desc = tx.description.replace(/^Venda:\s*/, "");
      const itemMatches = desc.split(",").map(s => s.trim());

      // Revert stock for each product (best-effort by name match)
      if (productIds.length) {
        const { data: prods } = await supabase.from("products").select("*").in("id", productIds);
        if (prods) {
          for (const p of prods) {
            const match = itemMatches.find(m => m.toLowerCase().includes(p.name.toLowerCase()));
            const qty = match ? parseInt(match.match(/^(\d+)x/)?.[1] || "0") : 0;
            if (qty > 0) {
              await supabase.from("products").update({
                stock: p.stock + qty,
                sold: Math.max(0, (p.sold || 0) - qty),
              }).eq("id", p.id);
            }
          }
        }
      }

      // Delete transaction
      const { error } = await supabase.from("transactions").delete().eq("id", saleId);
      if (error) throw error;

      toast.success("Venda apagada e estoque revertido");
      setDeleteId(null);
      fetchProducts();
      fetchRecentSales();
    } catch (err: any) {
      toast.error("Erro ao apagar: " + (err.message || ""));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-display gold-text">Vendas</h1>
        <p className="text-muted-foreground text-sm mt-1">PDV — Ponto de venda físico e online</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product catalog */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 bg-secondary border-border"
              />
            </div>
            <Select value={saleType} onValueChange={setSaleType}>
              <SelectTrigger className="w-[140px] bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fisico">Físico</SelectItem>
                <SelectItem value="online">Online</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filtered.map((p, i) => {
              const inCart = cart.find(c => c.product.id === p.id);
              return (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => addToCart(p)}
                  className={`bg-card border rounded-lg p-3 text-left hover:border-primary/50 transition-all ${
                    inCart ? "border-primary ring-1 ring-primary/30" : "border-border"
                  } ${p.stock <= 0 ? "opacity-50" : ""}`}
                >
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-semibold text-sm text-primary">{fmt(Number(p.sell_price))}</span>
                    <Badge variant={p.stock <= 0 ? "destructive" : "secondary"} className="text-[10px]">
                      {p.stock} un
                    </Badge>
                  </div>
                  {inCart && (
                    <div className="mt-1 text-[10px] text-primary font-medium">{inCart.quantity} no carrinho</div>
                  )}
                </motion.button>
              );
            })}
            {filtered.length === 0 && !loading && (
              <p className="col-span-3 text-center text-muted-foreground py-8">Nenhum produto encontrado.</p>
            )}
          </div>
        </div>

        {/* Cart */}
        <div className="bg-card border border-border rounded-lg p-4 flex flex-col h-fit lg:sticky lg:top-4">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg tracking-wide">Carrinho</h2>
            <Badge variant="secondary" className="ml-auto">{cart.length}</Badge>
          </div>

          {cart.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">Carrinho vazio</p>
          ) : (
            <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto">
              {cart.map(c => (
                <div key={c.product.id} className="flex items-center gap-2 py-2 border-b border-border/50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.product.name}</p>
                    <p className="text-xs text-muted-foreground">{fmt(Number(c.product.sell_price))} un</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQuantity(c.product.id, -1)} className="p-1 rounded hover:bg-secondary">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm font-medium w-6 text-center">{c.quantity}</span>
                    <button onClick={() => updateQuantity(c.product.id, 1)} className="p-1 rounded hover:bg-secondary">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-sm font-medium w-20 text-right">{fmt(c.quantity * Number(c.product.sell_price))}</span>
                  <button onClick={() => removeFromCart(c.product.id)} className="p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-border pt-3 mt-auto space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Total</span>
              <span className="text-xl font-display gold-text">{fmt(total)}</span>
            </div>

            <div className="flex gap-2">
              {paymentMethods.map(m => (
                <button
                  key={m.value}
                  onClick={() => setPaymentMethod(m.value)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border text-xs transition-all ${
                    paymentMethod === m.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <m.icon className="h-4 w-4" />
                  {m.label}
                </button>
              ))}
            </div>

            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={cart.length === 0}
              className="w-full"
            >
              Finalizar Venda
            </Button>
          </div>
        </div>
      </div>

      {/* Recent sales */}
      {recentSales.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="font-display text-xl mb-4 tracking-wide">Vendas Recentes</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSales.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm">{new Date(s.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {s.sale_type === "fisico" ? "Físico" : "Online"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm capitalize">{s.payment_method}</TableCell>
                  <TableCell className="text-sm">{s.items_count}</TableCell>
                  <TableCell className="text-right font-medium text-sm text-success">{fmt(s.total)}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => setDeleteId(s.id)}
                      className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      title="Apagar venda e reverter estoque"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Apagar venda?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover a venda do financeiro e devolver os produtos ao estoque. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteSale(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Apagar e reverter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MP link toast */}
      {mpLink && (
        <div className="fixed bottom-4 right-4 bg-card border border-primary rounded-lg p-4 shadow-xl max-w-sm z-50">
          <p className="text-sm font-medium mb-2">Link de pagamento Mercado Pago gerado</p>
          <a
            href={mpLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-primary text-sm hover:underline"
          >
            Abrir checkout <ExternalLink className="h-3 w-3" />
          </a>
          <button
            onClick={() => setMpLink(null)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Confirmar Venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              {cart.map(c => (
                <div key={c.product.id} className="flex justify-between text-sm">
                  <span>{c.quantity}x {c.product.name}</span>
                  <span>{fmt(c.quantity * Number(c.product.sell_price))}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="font-medium">Total</span>
              <span className="text-xl font-display gold-text">{fmt(total)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Pagamento: <span className="capitalize">{paymentMethod}</span></span>
              <span>Tipo: {saleType === "fisico" ? "Físico" : "Online"}</span>
            </div>
            <Button onClick={finalizeSale} disabled={processing} className="w-full">
              {processing ? "Processando..." : "Confirmar e Finalizar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
