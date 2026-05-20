import { useEffect, useState } from "react";
import { Scissors, DollarSign, Users, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const WEEK_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const PIE_COLORS = ["hsl(38,92%,50%)", "hsl(160,70%,45%)", "hsl(220,70%,55%)", "hsl(340,75%,55%)", "hsl(280,60%,55%)", "hsl(20,80%,55%)"];

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

interface RecentCut { id: string; service: string; barber: string; price: number; appointment_time: string; }

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ cortesHoje: 0, receitaDia: 0, clientesAtivos: 0, ticketMedio: 0 });
  const [weekData, setWeekData] = useState(WEEK_LABELS.map(day => ({ day, cortes: 0 })));
  const [recent, setRecent] = useState<RecentCut[]>([]);
  const [marginData, setMarginData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date(); today.setHours(0,0,0,0);
      const todayISO = toISO(today);

      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Sunday
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const [{ data: shop }] = await Promise.all([
        supabase.from("barbershops").select("id").eq("owner_id", user.id).maybeSingle(),
      ]);
      const shopId = shop?.id;

      const baseAppt = () => {
        let q = supabase.from("appointments").select("id,service,barber,price,appointment_time,appointment_date,status");
        q = shopId ? q.or(`owner_id.eq.${user.id},barbershop_id.eq.${shopId}`) : q.eq("owner_id", user.id);
        return q;
      };

      const [cutsToday, cutsWeek, recentCuts, txToday, activeSubs] = await Promise.all([
        baseAppt().eq("status", "concluido").eq("appointment_date", todayISO),
        baseAppt().eq("status", "concluido").gte("appointment_date", toISO(weekStart)).lte("appointment_date", toISO(weekEnd)),
        baseAppt().eq("status", "concluido").order("appointment_date", { ascending: false }).order("appointment_time", { ascending: false }).limit(5),
        supabase.from("transactions").select("value,type").eq("owner_id", user.id).eq("transaction_date", todayISO).eq("type", "entrada"),
        shopId
          ? supabase.from("subscriptions").select("user_id", { count: "exact", head: true }).eq("barbershop_id", shopId).eq("status", "ativo")
          : Promise.resolve({ count: 0 } as any),
      ]);

      const todayCount = cutsToday.data?.length || 0;
      const receita = (txToday.data || []).reduce((s: number, t: any) => s + Number(t.value || 0), 0);
      const ticket = todayCount > 0 ? receita / todayCount : 0;

      setStats({
        cortesHoje: todayCount,
        receitaDia: receita,
        clientesAtivos: (activeSubs as any).count || 0,
        ticketMedio: ticket,
      });

      const byDay = WEEK_LABELS.map(day => ({ day, cortes: 0 }));
      (cutsWeek.data || []).forEach((a: any) => {
        const d = new Date(a.appointment_date + "T00:00:00");
        byDay[d.getDay()].cortes += 1;
      });
      setWeekData(byDay);

      setRecent((recentCuts.data || []).map((r: any) => ({
        id: r.id, service: r.service, barber: r.barber,
        price: Number(r.price || 0), appointment_time: r.appointment_time,
      })));

      // Margem por categoria (mês atual)
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const { data: monthTx } = await supabase
        .from("transactions")
        .select("value,type,category")
        .eq("owner_id", user.id)
        .gte("transaction_date", toISO(monthStart));
      const byCat: Record<string, number> = {};
      (monthTx || []).forEach((t: any) => {
        const v = Number(t.value || 0);
        const signed = t.type === "entrada" ? v : -v;
        byCat[t.category || "Outros"] = (byCat[t.category || "Outros"] || 0) + signed;
      });
      setMarginData(
        Object.entries(byCat)
          .map(([name, value]) => ({ name, value: Math.max(0, value) }))
          .filter(d => d.value > 0)
      );
    })();
  }, [user]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-display gold-text">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral da sua barbearia</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Cortes Hoje" value={String(stats.cortesHoje)} icon={Scissors} index={0} />
        <StatCard title="Receita do Dia" value={fmt(stats.receitaDia)} icon={DollarSign} index={1} />
        <StatCard title="Clientes Ativos" value={String(stats.clientesAtivos)} icon={Users} index={2} />
        <StatCard title="Ticket Médio" value={fmt(stats.ticketMedio)} icon={TrendingUp} index={3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="font-display text-xl mb-4 tracking-wide">Cortes da Semana</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weekData}>
              <XAxis dataKey="day" stroke="hsl(0,0%,40%)" fontSize={12} />
              <YAxis stroke="hsl(0,0%,40%)" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(0,0%,9%)", border: "1px solid hsl(0,0%,16%)", borderRadius: 8, color: "hsl(40,10%,90%)" }} />
              <Bar dataKey="cortes" fill="hsl(38,92%,50%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="font-display text-xl mb-4 tracking-wide">Margens por Categoria (mês)</h2>
          {marginData.length === 0 ? (
            <p className="text-muted-foreground text-sm py-16 text-center">Sem receitas registradas neste mês.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={marginData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                  {marginData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: any) => fmt(Number(v))}
                  contentStyle={{ backgroundColor: "hsl(0,0%,9%)", border: "1px solid hsl(0,0%,16%)", borderRadius: 8, color: "hsl(40,10%,90%)" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="font-display text-xl mb-4 tracking-wide">Últimos Cortes</h2>
        {recent.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">Nenhum corte registrado ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map(r => (
              <li key={r.id} className="py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"><Scissors className="h-4 w-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{r.service}</p>
                  <p className="text-xs text-muted-foreground">{r.barber} · {r.appointment_time?.slice(0,5)}</p>
                </div>
                <span className="text-sm font-medium gold-text">{fmt(r.price)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
