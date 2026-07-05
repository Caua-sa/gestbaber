import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, Loader2, Ban, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClientBarbershop } from "@/hooks/useClientBarbershop";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  popular: boolean;
}

interface ActiveSub {
  id: string;
  plan_id: string;
  plan_name: string;
  status: string;
  expires_at: string | null;
  mp_subscription_id: string | null;
}

export function ClientePlanos() {
  const { user } = useAuth();
  const { shop, loading: shopLoading } = useClientBarbershop();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeSub, setActiveSub] = useState<ActiveSub | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    if (user) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id, plan_id, status, expires_at, plans(name)")
        .eq("user_id", user.id)
        .in("status", ["ativo", "cancelando"])
        .maybeSingle();
      if (sub) {
        const { data: mpSub } = await supabase.from("mp_subscriptions").select("id").eq("subscription_id", sub.id).maybeSingle();
        setActiveSub({
          id: sub.id,
          plan_id: sub.plan_id!,
          plan_name: (sub as any).plans?.name || "-",
          status: sub.status || "",
          expires_at: sub.expires_at,
          mp_subscription_id: mpSub?.id || null,
        });
      } else {
        setActiveSub(null);
      }
    }
    if (shop) {
      const { data } = await supabase
        .from("plans")
        .select("*")
        .eq("barbershop_id", shop.id)
        .eq("active", true)
        .order("price");
      setPlans((data || []).map((p: any) => ({ ...p, features: p.features || [] })));
    } else {
      setPlans([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (shopLoading) return;
    fetchData();
  }, [user, shop, shopLoading]);

  const handleSubscribe = async (planId: string) => {
    if (!user || !shop) return;
    setSubscribing(planId);
    try {
      const { data, error } = await supabase.functions.invoke("mp-create-subscription", {
        body: { plan_id: planId, admin_user_id: shop.owner_id },
      });
      if (data?.error) throw new Error(data.error);
      if (error) throw new Error(error.message || "Erro ao contatar servidor");
      if (!data?.init_point) throw new Error("Resposta inválida do servidor");
      window.location.href = data.init_point;
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar assinatura", { duration: 6000 });
      setSubscribing(null);
    }
  };

  const handleCancel = async () => {
    if (!activeSub?.mp_subscription_id) return;
    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("mp-cancel-subscription", {
        body: { mp_subscription_id: activeSub.mp_subscription_id, mode: "end_of_cycle" },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Erro ao cancelar");
      toast.success("Assinatura cancelada. Acesso válido até o final do período.");
      setCancelOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCancelling(false);
    }
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (loading || shopLoading) return <div className="text-center text-muted-foreground py-8">Carregando planos...</div>;

  return (
    <div className="space-y-6">
      {shop && (
        <p className="text-sm text-muted-foreground">Planos disponíveis em <span className="text-primary font-medium">{shop.name}</span></p>
      )}

      {/* Active Subscription */}
      {activeSub && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Sua assinatura</p>
              <p className="font-display text-lg flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" /> {activeSub.plan_name}
              </p>
              {activeSub.status === "cancelando" ? (
                <p className="text-xs text-warning mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Acesso válido até {activeSub.expires_at ? new Date(activeSub.expires_at).toLocaleDateString("pt-BR") : "-"}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">Renova em {activeSub.expires_at ? new Date(activeSub.expires_at).toLocaleDateString("pt-BR") : "-"}</p>
              )}
            </div>
            {activeSub.status === "ativo" && activeSub.mp_subscription_id && (
              <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setCancelOpen(true)}>
                <Ban className="h-4 w-4 mr-1" /> Cancelar
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {plans.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          {shop ? "Esta barbearia ainda não publicou planos." : "Nenhuma barbearia disponível."}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan, i) => {
            const isActive = activeSub?.plan_id === plan.id;
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
                  {isActive ? "Plano atual" : subscribing === plan.id ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redirecionando...</>
                  ) : "Assinar com Mercado Pago"}
                </Button>
              </motion.div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Pagamento processado pelo Mercado Pago. Cobrança recorrente automática. Cancele quando quiser.
      </p>

      {/* Cancel Modal */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Cancelar assinatura?</DialogTitle>
            <DialogDescription>
              Sua assinatura permanecerá ativa até <span className="text-foreground font-medium">{activeSub?.expires_at ? new Date(activeSub.expires_at).toLocaleDateString("pt-BR") : "-"}</span>. Depois disso, você perderá os benefícios do plano.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelling}>Manter plano</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Cancelando...</> : "Confirmar cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
