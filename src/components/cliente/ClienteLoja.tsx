import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  category: string;
  sell_price: number;
  stock: number;
  owner_id: string | null;
}

interface CartItem {
  product: Product;
  qty: number;
}

export function ClienteLoja() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    supabase.from("products").select("id, name, category, sell_price, stock, owner_id").eq("active", true).eq("visible_on_site", true).gt("stock", 0).order("name")
      .then(({ data }) => { if (data) setProducts(data as Product[]); setLoading(false); });
  }, []);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map(c => c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.map(c => c.product.id === productId ? { ...c, qty: c.qty - 1 } : c).filter(c => c.qty > 0));
  };

  const cartTotal = cart.reduce((s, c) => s + c.qty * Number(c.product.sell_price), 0);

  const handleOrder = async () => {
    if (!user || cart.length === 0) return;
    setOrdering(true);
    try {
      const orders = cart.map(c => ({
        user_id: user.id,
        product_id: c.product.id,
        quantity: c.qty,
        unit_price: Number(c.product.sell_price),
        total: c.qty * Number(c.product.sell_price),
        owner_id: c.product.owner_id,
      }));
      const { error } = await supabase.from("orders").insert(orders);
      if (error) throw error;
      toast.success("Pedido realizado com sucesso!");
      setCart([]);
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer pedido");
    } finally {
      setOrdering(false);
    }
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (loading) return <p className="text-center text-muted-foreground py-8">Carregando produtos...</p>;

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl tracking-wide gold-text">Loja</h2>

      {products.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhum produto disponível no momento.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {products.map((p, i) => {
            const inCart = cart.find(c => c.product.id === p.id)?.qty || 0;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-border rounded-lg p-4"
              >
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground mb-2">{p.category}</p>
                <p className="text-lg font-bold text-primary mb-3">{fmt(Number(p.sell_price))}</p>
                <div className="flex items-center gap-2">
                  {inCart > 0 ? (
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => removeFromCart(p.id)}><Minus className="h-3 w-3" /></Button>
                      <span className="text-sm font-medium w-6 text-center">{inCart}</span>
                      <Button size="sm" variant="outline" onClick={() => addToCart(p)} disabled={inCart >= p.stock}><Plus className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => addToCart(p)} className="gap-1"><ShoppingCart className="h-3.5 w-3.5" /> Adicionar</Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {cart.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border-2 border-primary rounded-lg p-5 sticky bottom-4"
        >
          <h3 className="font-display text-lg mb-3">Carrinho</h3>
          <div className="space-y-2 mb-4">
            {cart.map(c => (
              <div key={c.product.id} className="flex justify-between text-sm">
                <span>{c.qty}x {c.product.name}</span>
                <span className="font-medium">{fmt(c.qty * Number(c.product.sell_price))}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="font-display text-lg">Total: <span className="text-primary">{fmt(cartTotal)}</span></span>
            <Button onClick={handleOrder} disabled={ordering}>{ordering ? "Enviando..." : "Finalizar Pedido"}</Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
