import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Chrome, UserCircle } from "lucide-react";

type Ev = { id: string; method: string; phone: string | null; email: string | null; full_name: string | null; created_at: string };

const META: Record<string, { label: string; icon: any }> = {
  google: { label: "Google", icon: Chrome },
  whatsapp: { label: "WhatsApp", icon: MessageCircle },
  perfil: { label: "Perfil criado", icon: UserCircle },
};

export default function AdminLoginsClientes() {
  const [items, setItems] = useState<Ev[]>([]);
  const [filter, setFilter] = useState<string>("todos");

  const load = async () => {
    const { data } = await supabase.from("client_login_events").select("*").order("created_at", { ascending: false }).limit(300);
    setItems((data as Ev[]) || []);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel(`logins-${Math.random()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "client_login_events" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const shown = filter === "todos" ? items : items.filter((i) => i.method === filter);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl gold-text">Logins de Clientes</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Object.entries(META).map(([k, m]) => (
          <Card key={k} onClick={() => setFilter(filter === k ? "todos" : k)}
            className={`p-4 cursor-pointer flex items-center gap-3 ${filter === k ? "border-primary" : ""}`}>
            <m.icon className="h-6 w-6 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">{m.label}</p>
              <p className="text-2xl font-display">{items.filter((i) => i.method === k).length}</p>
            </div>
          </Card>
        ))}
      </div>
      <Card className="divide-y divide-border">
        {shown.length === 0 && <p className="p-6 text-center text-muted-foreground">Nenhum login ainda.</p>}
        {shown.map((i) => {
          const m = META[i.method];
          return (
            <div key={i.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">{i.full_name || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {i.phone || ""} {i.email && !i.email.endsWith("@barberpro.local") ? `· ${i.email}` : ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                <Badge variant="outline">{m?.label || i.method}</Badge>
                <p className="text-xs text-muted-foreground mt-1">{new Date(i.created_at).toLocaleString("pt-BR")}</p>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
