import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Req { id: string; name: string; barbershop_name: string; phone: string; email: string | null; city: string | null; status: string; created_at: string; }
const STATUS = ["novo", "em_teste", "assinou", "perdido"];
const LABEL: Record<string, string> = { novo: "Novo", em_teste: "Em teste", assinou: "Assinou", perdido: "Perdido" };

export function TrialRequests() {
  const [rows, setRows] = useState<Req[]>([]);
  const load = async () => {
    const { data } = await supabase.from("trial_requests").select("*").order("created_at", { ascending: false });
    setRows((data as Req[]) || []);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("trial_requests").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else load();
  };
  const remove = async (id: string) => {
    if (!confirm("Excluir pedido?")) return;
    await supabase.from("trial_requests").delete().eq("id", id); load();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h2 className="font-display text-2xl">Pedidos de teste grátis ({rows.length})</h2>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhum pedido ainda.</p>}
      {rows.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3">
          <div className="min-w-0">
            <p className="font-semibold">{r.barbershop_name} <Badge variant="outline">{LABEL[r.status] || r.status}</Badge></p>
            <p className="text-sm text-muted-foreground">{r.name} · {r.phone}{r.email ? ` · ${r.email}` : ""}{r.city ? ` · ${r.city}` : ""}</p>
            <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {STATUS.map((s) => (
              <Button key={s} size="sm" variant={r.status === s ? "default" : "outline"} onClick={() => setStatus(r.id, s)}>{LABEL[s]}</Button>
            ))}
            <Button size="sm" variant="outline" asChild>
              <a href={`https://wa.me/${r.phone.replace(/\D/g, "").replace(/^(?!55)/, "55")}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /></a>
            </Button>
            <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      ))}
    </div>
  );
}
