import { useEffect, useState } from "react";
import { Scissors, DollarSign, Users, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const emptyWeek = [
  { day: "Seg", cortes: 0 },
  { day: "Ter", cortes: 0 },
  { day: "Qua", cortes: 0 },
  { day: "Qui", cortes: 0 },
  { day: "Sex", cortes: 0 },
  { day: "Sáb", cortes: 0 },
  { day: "Dom", cortes: 0 },
];

const emptyServices = [
  { name: "Sem dados", value: 1, color: "hsl(0, 0%, 20%)" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ cortesHoje: 0, receitaDia: 0, clientesAtivos: 0, ticketMedio: 0 });

  useEffect(() => {
    // Dashboard zerado — dados reais virão das tabelas conforme houver movimentação
    setStats({ cortesHoje: 0, receitaDia: 0, clientesAtivos: 0, ticketMedio: 0 });
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-display gold-text">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral da sua barbearia</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Cortes Hoje" value={String(stats.cortesHoje)} icon={Scissors} index={0} />
        <StatCard title="Receita do Dia" value={`R$ ${stats.receitaDia.toFixed(2)}`} icon={DollarSign} index={1} />
        <StatCard title="Clientes Ativos" value={String(stats.clientesAtivos)} icon={Users} index={2} />
        <StatCard title="Ticket Médio" value={`R$ ${stats.ticketMedio.toFixed(2)}`} icon={TrendingUp} index={3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5">
          <h2 className="font-display text-xl mb-4 tracking-wide">Cortes da Semana</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={emptyWeek}>
              <XAxis dataKey="day" stroke="hsl(0,0%,40%)" fontSize={12} />
              <YAxis stroke="hsl(0,0%,40%)" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(0,0%,9%)", border: "1px solid hsl(0,0%,16%)", borderRadius: 8, color: "hsl(40,10%,90%)" }}
              />
              <Bar dataKey="cortes" fill="hsl(38,92%,50%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="font-display text-xl mb-4 tracking-wide">Serviços</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={emptyServices} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                {emptyServices.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <p className="text-center text-muted-foreground text-sm mt-2">Sem dados ainda</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="font-display text-xl mb-4 tracking-wide">Últimos Cortes</h2>
        <p className="text-muted-foreground text-sm py-8 text-center">Nenhum corte registrado ainda.</p>
      </div>
    </div>
  );
}
