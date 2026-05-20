import { useEffect, useState } from "react";
import { Scissors, TrendingUp, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Barber {
  id: string;
  name: string;
  commission_pct: number;
}

interface Row {
  barber: Barber;
  count: number;
  bruto: number;
  comissao: number;
}

function firstDay(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`; }
function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

export default function AdminGanhosBarbeiros() {
  const { user } = useAuth();
  const [from, setFrom] = useState(firstDay(new Date()));
  const [to, setTo] = useState(today());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: barbers } = await supabase
        .from("barbers")
        .select("id,name,commission_pct")
        .eq("owner_id", user.id);

      const { data: appts } = await supabase
        .from("appointments")
        .select("barber_id,barber,price,status,appointment_date")
        .eq("owner_id", user.id)
        .eq("status", "concluido")
        .gte("appointment_date", from)
        .lte("appointment_date", to);

      const map = new Map<string, Row>();
      (barbers || []).forEach((b: any) => {
        map.set(b.id, { barber: b, count: 0, bruto: 0, comissao: 0 });
      });

      (appts || []).forEach((a: any) => {
        const price = Number(a.price || 0);
        let row = a.barber_id ? map.get(a.barber_id) : null;
        if (!row) {
          // fallback by name (legacy free-text)
          row = Array.from(map.values()).find(r => r.barber.name === a.barber) || null;
        }
        if (!row) {
          const fake = { id: `__${a.barber || "sem"}`, name: a.barber || "Sem barbeiro", commission_pct: 0 };
          row = { barber: fake, count: 0, bruto: 0, comissao: 0 };
          map.set(fake.id, row);
        }
        row.count += 1;
        row.bruto += price;
        row.comissao += price * (Number(row.barber.commission_pct || 0) / 100);
      });

      setRows(Array.from(map.values()).sort((a,b) => b.bruto - a.bruto));
      setLoading(false);
    })();
  }, [user, from, to]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const totalBruto = rows.reduce((s, r) => s + r.bruto, 0);
  const totalComissao = rows.reduce((s, r) => s + r.comissao, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-display gold-text">Ganhos dos Barbeiros</h1>
        <p className="text-muted-foreground text-sm mt-1">Bruto e comissão por período (cortes concluídos)</p>
      </div>

      <div className="flex flex-wrap gap-3 items-end bg-card border border-border rounded-lg p-4">
        <div>
          <Label className="text-xs">De</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" />
        </div>
        <div>
          <Label className="text-xs">Até</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs text-muted-foreground uppercase">Total bruto</p>
          <p className="font-display text-3xl gold-text mt-1">{fmt(totalBruto)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs text-muted-foreground uppercase">Total comissões</p>
          <p className="font-display text-3xl gold-text mt-1">{fmt(totalComissao)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs text-muted-foreground uppercase">Margem barbearia</p>
          <p className="font-display text-3xl gold-text mt-1">{fmt(totalBruto - totalComissao)}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <p className="text-muted-foreground text-sm py-12 text-center">Carregando...</p>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground text-sm py-12 text-center">Nenhum corte concluído no período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-border text-xs text-muted-foreground uppercase">
                <th className="p-4">Barbeiro</th>
                <th className="p-4">Cortes</th>
                <th className="p-4">% Comissão</th>
                <th className="p-4 text-right">Bruto</th>
                <th className="p-4 text-right">Comissão</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.barber.id} className="border-b border-border/50 last:border-0">
                  <td className="p-4 flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Scissors className="h-4 w-4 text-primary" />
                    </div>
                    {r.barber.name}
                  </td>
                  <td className="p-4">{r.count}</td>
                  <td className="p-4">{Number(r.barber.commission_pct || 0)}%</td>
                  <td className="p-4 text-right font-medium">{fmt(r.bruto)}</td>
                  <td className="p-4 text-right gold-text font-medium">{fmt(r.comissao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
