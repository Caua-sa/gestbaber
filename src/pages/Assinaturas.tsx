import { motion } from "framer-motion";
import { Crown, Users, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";

const plans = [
  { name: "Básico", price: "R$ 79", period: "/mês", features: ["2 cortes por mês", "Desconto de 10% em produtos", "Agendamento prioritário"], color: "border-border" },
  { name: "Premium", price: "R$ 129", period: "/mês", features: ["4 cortes por mês", "1 barba grátis", "Desconto de 20% em produtos", "Agendamento VIP"], color: "border-primary", popular: true },
  { name: "VIP", price: "R$ 199", period: "/mês", features: ["Cortes ilimitados", "Barba ilimitada", "Desconto de 30% em produtos", "Agendamento VIP", "Cerveja cortesia"], color: "border-border" },
];

const subscribers = [
  { name: "Carlos Silva", plan: "Premium", since: "Jan 2024", status: "ativo" },
  { name: "Pedro Santos", plan: "VIP", since: "Mar 2024", status: "ativo" },
  { name: "Rafael Lima", plan: "Básico", since: "Fev 2024", status: "ativo" },
  { name: "André Costa", plan: "Premium", since: "Dez 2023", status: "ativo" },
  { name: "Marcos Oliveira", plan: "Básico", since: "Abr 2024", status: "vencido" },
];

export default function Assinaturas() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-display gold-text">Assinaturas</h1>
        <p className="text-muted-foreground text-sm mt-1">Planos e clientes assinantes</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Assinantes Ativos" value="87" change="+12 este mês" icon={Users} index={0} />
        <StatCard title="Receita Recorrente" value="R$ 9.430" change="+15% vs mês anterior" icon={Crown} index={1} />
        <StatCard title="Plano Mais Popular" value="Premium" icon={Star} index={2} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`bg-card border-2 ${plan.color} rounded-lg p-6 relative ${plan.popular ? "card-glow" : ""}`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 gold-gradient text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
                Mais popular
              </span>
            )}
            <h3 className="font-display text-2xl tracking-wide">{plan.name}</h3>
            <div className="mt-2 mb-4">
              <span className="text-3xl font-bold">{plan.price}</span>
              <span className="text-muted-foreground text-sm">{plan.period}</span>
            </div>
            <ul className="space-y-2 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button variant={plan.popular ? "default" : "outline"} className="w-full">
              Selecionar
            </Button>
          </motion.div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="font-display text-xl mb-4 tracking-wide">Assinantes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-3 px-2 font-medium">Cliente</th>
                <th className="text-left py-3 px-2 font-medium">Plano</th>
                <th className="text-left py-3 px-2 font-medium">Desde</th>
                <th className="text-left py-3 px-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((sub, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-3 px-2 font-medium">{sub.name}</td>
                  <td className="py-3 px-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{sub.plan}</span>
                  </td>
                  <td className="py-3 px-2 text-muted-foreground">{sub.since}</td>
                  <td className="py-3 px-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      sub.status === "ativo" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    }`}>{sub.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
