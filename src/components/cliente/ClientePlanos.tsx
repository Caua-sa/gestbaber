import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

export function ClientePlanos() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Tables<"plans">[]>([]);
  const [activeSub, setActiveSub] = useState<Tables<"subscriptions"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    const [plansRes, subRes] = await Promise.all([
      supabase.from("plans").select("*").eq("active", true).order("price"),
      user
        ? supabase.from("subscriptions").select("*").eq("user_id", user.id).eq("status", "ativo").maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (plansRes.data) setPlans(plansRes.data);
    if (subRes.data) setActiveSub(subRes.data);
    setLoading(false);
  };

  const handleSubscribe = async (planId: string) => {
    if (!user) return;
    setSubscribing(true);
    try {
      if (activeSub) {
        await supabase.from("subscriptions").update({ status: "cancelado" }).eq("id", activeSub.id);
      }
      const { error } = await supabase.from("subscriptions").insert({
        user_id: user.id,
        plan_id: planId,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      if (error) throw error;
      toast.success("Plano assinado com sucesso!");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao assinar");
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) return <div className="text-center text-muted-foreground py-8">Carregando planos...</div>;

  return (
    <div className="space-y-6">
      {activeSub && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 flex items-center gap-3">
          <Crown className="h-5 w-5 text-primary" />
          <p className="text-sm">
            Você tem um plano <strong className="text-primary">{plans.find(p => p.id === activeSub.plan_id)?.name}</strong> ativo
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan, i) => {
          const features = Array.isArray(plan.features) ? plan.features as string[] : [];
          const isActive = activeSub?.plan_id === plan.id;
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-card border-2 ${plan.popular ? "border-primary card-glow" : "border-border"} rounded-lg p-6 relative`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 gold-gradient text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
                  Mais popular
                </span>
              )}
              <h3 className="font-display text-2xl tracking-wide">{plan.name}</h3>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-bold">R$ {(plan.price / 100).toFixed(0)}</span>
                <span className="text-muted-foreground text-sm">/{plan.period}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {features.map((f) => (
                  <li key={String(f)} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    {String(f)}
                  </li>
                ))}
              </ul>
              <Button
                variant={isActive ? "outline" : plan.popular ? "default" : "outline"}
                className="w-full"
                disabled={isActive || subscribing}
                onClick={() => handleSubscribe(plan.id)}
              >
                {isActive ? "Plano atual" : "Assinar"}
              </Button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
