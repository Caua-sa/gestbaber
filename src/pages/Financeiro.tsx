import { motion } from "framer-motion";
import { DollarSign, TrendingUp, TrendingDown, CreditCard } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const monthlyRevenue = [
  { month: "Jan", receita: 18500, despesas: 8200 },
  { month: "Fev", receita: 21000, despesas: 8500 },
  { month: "Mar", receita: 19800, despesas: 9000 },
  { month: "Abr", receita: 23500, despesas: 8800 },
  { month: "Mai", receita: 25200, despesas: 9100 },
  { month: "Jun", receita: 27800, despesas: 9500 },
];

const transactions = [
  { desc: "Corte - Carlos Silva", type: "entrada", value: "R$ 45", date: "Hoje 14:30" },
  { desc: "Produto - Pomada", type: "entrada", value: "R$ 35", date: "Hoje 13:00" },
  { desc: "Fornecedor - Navalhas", type: "saída", value: "R$ 120", date: "Hoje 10:00" },
  { desc: "Combo - Pedro Santos", type: "entrada", value: "R$ 75", date: "Ontem 18:00" },
  { desc: "Aluguel", type: "saída", value: "R$ 3.500", date: "01/06" },
  { desc: "Assinaturas", type: "entrada", value: "R$ 9.430", date: "01/06" },
];

export default function Financeiro() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-display gold-text">Financeiro</h1>
        <p className="text-muted-foreground text-sm mt-1">Receitas, despesas e fluxo de caixa</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Receita Mensal" value="R$ 27.800" change="+10% vs mês anterior" icon={TrendingUp} index={0} />
        <StatCard title="Despesas" value="R$ 9.500" icon={TrendingDown} index={1} />
        <StatCard title="Lucro Líquido" value="R$ 18.300" change="+12%" icon={DollarSign} index={2} />
        <StatCard title="Recebimentos Pendentes" value="R$ 2.150" icon={CreditCard} index={3} />
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="font-display text-xl mb-4 tracking-wide">Receita vs Despesas</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlyRevenue}>
            <XAxis dataKey="month" stroke="hsl(0,0%,40%)" fontSize={12} />
            <YAxis stroke="hsl(0,0%,40%)" fontSize={12} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(0,0%,9%)", border: "1px solid hsl(0,0%,16%)", borderRadius: 8, color: "hsl(40,10%,90%)" }} />
            <Bar dataKey="receita" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} name="Receita" />
            <Bar dataKey="despesas" fill="hsl(0,0%,30%)" radius={[4, 4, 0, 0]} name="Despesas" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="font-display text-xl mb-4 tracking-wide">Últimas Transações</h2>
        <div className="space-y-3">
          {transactions.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between py-3 border-b border-border/50 last:border-0"
            >
              <div>
                <p className="font-medium text-sm">{t.desc}</p>
                <p className="text-xs text-muted-foreground">{t.date}</p>
              </div>
              <span className={`font-medium text-sm ${t.type === "entrada" ? "text-success" : "text-destructive"}`}>
                {t.type === "entrada" ? "+" : "-"}{t.value}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
