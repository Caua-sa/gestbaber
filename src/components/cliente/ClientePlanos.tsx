import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  popular: boolean;
  barbershop_id: string | null;
}

interface Barbershop {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
}

export function ClientePlanos() {
  const { user } = useAuth();
  const [shops, setShops] = useState<Barbershop[]>([]);
  const [selectedShop, setSelectedShop] = useState<string>("");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeSubPlanId, setActiveSubPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("barbershops").select("id, owner_id, name, slug").eq("active", true);
      if (s && s.length) {
        setShops(s);
        setSelectedShop(s[0].id);
      }
      if (user) {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("plan_id")
          .eq("user_id", user.id)
          .in("status", ["ativo", "cancelando"])
          .maybeSingle();
        if (sub) setActiveSubPlanId(sub.plan_id);
      }
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!selectedShop) { setPlans([]); return; }
    supabase
      .from("plans")
      .select("*")
      .eq("barbershop_id", selectedShop)
      .eq("active", true)
      .order("price")
      .then(({ data }) => {
        if (data) setPlans(data.map((p: any) => ({ ...p, features: p.features || [] })));
      });
  }, [selectedShop]);

  const handleSubscribe = async (planId: string) => {
    if (!user) return;
    const shop = shops.find(s => s.id === selectedShop);
    if (!shop) return;
    setSubscribing(planId);
    try {
      const { data, error } = await supabase.functions.invoke("mp-create-subscription", {
        body: { plan_id: planId, admin_user_id: shop.owner_id },
      });
      // Edge function retorna o erro no body mesmo com status != 2xx
      if (data?.error) throw new Error(data.error);
      if (error) throw new Error(error.message || "Erro ao contatar servidor");
      if (!data?.init_point) throw new Error("Resposta inválida do servidor");
      window.location.href = data.init_point;
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar assinatura", { duration: 6000 });
      setSubscribing(null);
    }
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (loading) return <div className="text-center text-muted-foreground py-8">Carregando planos...</div>;

  return (
    <div className="space-y-6">
      {shops.length > 1 && (
        <div className="flex items-center gap-3 bg-card border border-border rounded-lg p-3">
          <Building2 className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Barbearia</p>
            <Select value={selectedShop} onValueChange={setSelectedShop}>
              <SelectTrigger className="bg-transparent border-0 h-7 px-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {shops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {plans.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          {selectedShop ? "Esta barbearia ainda não publicou planos." : "Nenhuma barbearia disponível."}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan, i) => {
            const isActive = activeSubPlanId === plan.id;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`bg-card border-2 rounded-2xl p-6 relative ${
                  plan.popular ? "border-primary card-glow" : "border-border"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 gold-gradient text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
                    Mais popular
                  </span>
                )}
                <h3 className="font-display text-2xl tracking-wide flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" /> {plan.name}
                </h3>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-display gold-text">{fmt(Number(plan.price))}</span>
                  <span className="text-muted-foreground text-sm">/{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={isActive ? "outline" : plan.popular ? "default" : "outline"}
                  className={`w-full ${plan.popular && !isActive ? "gold-gradient text-primary-foreground font-semibold" : ""}`}
                  disabled={isActive || subscribing === plan.id}
                  onClick={() => handleSubscribe(plan.id)}
                >
                  {isActive ? (
                    "Plano atual"
                  ) : subscribing === plan.id ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redirecionando...</>
                  ) : (
                    "Assinar com Mercado Pago"
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Pagamento processado pelo Mercado Pago. Cobrança recorrente automática. Cancele quando quiser.
      </p>
    </div>
  );
}
