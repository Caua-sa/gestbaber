import { Scissors, DollarSign, Users, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const weeklyData = [
  { day: "Seg", cortes: 12 },
  { day: "Ter", cortes: 18 },
  { day: "Qua", cortes: 15 },
  { day: "Qui", cortes: 22 },
  { day: "Sex", cortes: 28 },
  { day: "Sáb", cortes: 35 },
  { day: "Dom", cortes: 8 },
];

const serviceData = [
  { name: "Corte", value: 45, color: "hsl(38, 92%, 50%)" },
  { name: "Barba", value: 25, color: "hsl(38, 92%, 35%)" },
  { name: "Combo", value: 20, color: "hsl(38, 60%, 50%)" },
  { name: "Outros", value: 10, color: "hsl(0, 0%, 30%)" },
];

const recentCuts = [
  { client: "Carlos Silva", service: "Corte + Barba", barber: "João", time: "14:30", price: "R$ 75" },
  { client: "Pedro Santos", service: "Corte Degradê", barber: "Lucas", time: "13:00", price: "R$ 45" },
  { client: "Rafael Lima", service: "Barba", barber: "João", time: "12:00", price: "R$ 35" },
  { client: "Marcos Oliveira", service: "Corte Social", barber: "Lucas", time: "11:00", price: "R$ 40" },
  { client: "André Costa", service: "Combo Completo", barber: "João", time: "10:00", price: "R$ 90" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-display gold-text">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral da sua barbearia</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Cortes Hoje" value="24" change="+12% vs ontem" icon={Scissors} index={0} />
        <StatCard title="Receita do Dia" value="R$ 1.850" change="+8% vs ontem" icon={DollarSign} index={1} />
        <StatCard title="Clientes Ativos" value="342" change="+5 esta semana" icon={Users} index={2} />
        <StatCard title="Ticket Médio" value="R$ 62" change="+3% vs semana passada" icon={TrendingUp} index={3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5">
          <h2 className="font-display text-xl mb-4 tracking-wide">Cortes da Semana</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weeklyData}>
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
              <Pie data={serviceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                {serviceData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "hsl(0,0%,9%)", border: "1px solid hsl(0,0%,16%)", borderRadius: 8, color: "hsl(40,10%,90%)" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {serviceData.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-muted-foreground">{s.name}</span>
                </div>
                <span className="font-medium">{s.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="font-display text-xl mb-4 tracking-wide">Últimos Cortes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left py-3 px-2 font-medium">Cliente</th>
                <th className="text-left py-3 px-2 font-medium">Serviço</th>
                <th className="text-left py-3 px-2 font-medium">Barbeiro</th>
                <th className="text-left py-3 px-2 font-medium">Horário</th>
                <th className="text-right py-3 px-2 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {recentCuts.map((cut, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="py-3 px-2 font-medium">{cut.client}</td>
                  <td className="py-3 px-2 text-muted-foreground">{cut.service}</td>
                  <td className="py-3 px-2 text-muted-foreground">{cut.barber}</td>
                  <td className="py-3 px-2 text-muted-foreground">{cut.time}</td>
                  <td className="py-3 px-2 text-right text-primary font-medium">{cut.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
