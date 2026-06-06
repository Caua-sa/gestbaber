import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Minus, Plus, MapPin, CreditCard, Store, Loader2, Cake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClientBarbershop } from "@/hooks/useClientBarbershop";
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

const DISCOUNT_PERCENT = 10;

export function ClienteLoja() {
  const { user } = useAuth();
  const { shop } = useClientBarbershop();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [processing, setProcessing] = useState<"mp" | "shop" | null>(null);
  const [birthdayToday, setBirthdayToday] = useState(false);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, name, category, sell_price, stock, owner_id")
      .eq("active", true)
      .eq("visible_on_site", true)
      .gt("stock", 0)
      .order("name")
      .then(({ data }) => {
        if (data) setProducts(data as Product[]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("birthday").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (!data?.birthday) return;
        const d = new Date(data.birthday);
        const now = new Date();
        if (d.getUTCMonth() === now.getMonth() && d.getUTCDate() === now.getDate()) {
          setBirthdayToday(true);
        }
      });
  }, [user]);

  const addToCart = (p: Product) => {
    setCart((prev) => {
      const ex = prev.find((c) => c.product.id === p.id);
      if (ex) {
        if (ex.qty >= p.stock) return prev;
        return prev.map((c) => (c.product.id === p.id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { product: p, qty: 1 }];
    });
  };
  const removeFromCart = (id: string) =>
    setCart((prev) => prev.map((c) => (c.product.id === id ? { ...c, qty: c.qty - 1 } : c)).filter((c) => c.qty > 0));

  const subtotal = cart.reduce((s, c) => s + c.qty * Number(c.product.sell_price), 0);
  const discount = birthdayToday ? subtotal * (DISCOUNT_PERCENT / 100) : 0;
  const cartTotal = subtotal - discount;
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const insertOrders = async (status: "aguardando_pagamento" | "pendente") => {
    if (!user) return null;
    const factor = birthdayToday ? 1 - DISCOUNT_PERCENT / 100 : 1;
    const rows = cart.map((c) => {
      const unit = Number(c.product.sell_price) * factor;
      return {
        user_id: user.id,
        product_id: c.product.id,
        quantity: c.qty,
        unit_price: unit,
        total: c.qty * unit,
        owner_id: c.product.owner_id,
        status,
      };
    });
    const { error } = await supabase.from("orders").insert(rows);
    if (error) throw error;
    return rows;
  };

  const payAtShop = async () => {
    if (!user || cart.length === 0) return;
    setProcessing("shop");
    try {
      await insertOrders("pendente");
      toast.success("Pedido registrado! Pague e retire na barbearia.");
      setCart([]);
      setCheckoutOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar pedido");
    } finally {
      setProcessing(null);
    }
  };

  const payOnline = async () => {
    if (!user || cart.length === 0) return;
    const ownerId = shop?.owner_id || cart[0]?.product.owner_id;
    if (!ownerId) {
      toast.error("Barbearia não identificada");
      return;
    }
    setProcessing("mp");
    try {
      await insertOrders("aguardando_pagamento");
      const description = cart.map((c) => `${c.qty}x ${c.product.name}`).join(", ");
      const { data, error } = await supabase.functions.invoke("mp-create-payment", {
        body: {
          amount: cartTotal,
          description: `Loja: ${description}`,
          admin_user_id: ownerId,
          source: "loja",
        },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      if (!data?.init_point) throw new Error("Resposta inválida do servidor");
      window.location.href = data.init_point;
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar pagamento");
      setProcessing(null);
    }
  };

  if (loading) return <p className="text-center text-muted-foreground py-8">Carregando produtos...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl tracking-wide gold-text">Loja</h2>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MapPin className="h-3 w-3" /> Retirada na barbearia
        </p>
      </div>

      {products.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">Nenhum produto disponível no momento.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {products.map((p, i) => {
            const inCart = cart.find((c) => c.product.id === p.id)?.qty || 0;
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
                {inCart > 0 ? (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => removeFromCart(p.id)}><Minus className="h-3 w-3" /></Button>
                    <span className="text-sm font-medium w-6 text-center">{inCart}</span>
                    <Button size="sm" variant="outline" onClick={() => addToCart(p)} disabled={inCart >= p.stock}><Plus className="h-3 w-3" /></Button>
                  </div>
                ) : (
                  <Button size="sm" onClick={() => addToCart(p)} className="gap-1">
                    <ShoppingCart className="h-3.5 w-3.5" /> Adicionar
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {cart.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border-2 border-primary rounded-lg p-5 sticky bottom-4">
          <h3 className="font-display text-lg mb-3">Carrinho</h3>
          <div className="space-y-2 mb-4">
            {cart.map((c) => (
              <div key={c.product.id} className="flex justify-between text-sm">
                <span>{c.qty}x {c.product.name}</span>
                <span className="font-medium">{fmt(c.qty * Number(c.product.sell_price))}</span>
              </div>
            ))}
            {birthdayToday && (
              <div className="flex justify-between text-sm text-primary border-t border-border/50 pt-2">
                <span className="flex items-center gap-1.5"><Cake className="h-3.5 w-3.5" /> Desconto aniversário ({DISCOUNT_PERCENT}%)</span>
                <span className="font-medium">−{fmt(discount)}</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="font-display text-lg">Total: <span className="text-primary">{fmt(cartTotal)}</span></span>
            <Button onClick={() => setCheckoutOpen(true)}>Finalizar Pedido</Button>
          </div>
        </motion.div>
      )}

      <Dialog open={checkoutOpen} onOpenChange={(o) => !processing && setCheckoutOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Como deseja pagar?</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2 mb-2 flex items-center gap-1.5">
            <MapPin className="h-3 w-3" /> Retirada e entrega na barbearia
          </p>
          <div className="space-y-3">
            <button
              onClick={payOnline}
              disabled={!!processing}
              className="w-full text-left p-4 rounded-lg border border-border hover:border-primary transition-colors disabled:opacity-50"
            >
              <p className="font-medium flex items-center gap-2">
                {processing === "mp" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4 text-primary" />}
                Pagar online (Pix / Cartão)
              </p>
              <p className="text-xs text-muted-foreground mt-1">Você será redirecionado para o Mercado Pago.</p>
            </button>
            <button
              onClick={payAtShop}
              disabled={!!processing}
              className="w-full text-left p-4 rounded-lg border border-border hover:border-primary transition-colors disabled:opacity-50"
            >
              <p className="font-medium flex items-center gap-2">
                {processing === "shop" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4 text-primary" />}
                Pagar na barbearia
              </p>
              <p className="text-xs text-muted-foreground mt-1">Reservamos seus produtos. Pague ao retirar.</p>
            </button>
          </div>
          <p className="text-center text-lg font-display mt-2">Total: <span className="text-primary">{fmt(cartTotal)}</span></p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
