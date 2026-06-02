import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Mail, Phone, CalendarCheck, Crown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Client {
  user_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  subscription: {
    status: string;
    started_at: string;
    expires_at: string | null;
    plan_name: string;
    plan_price: number;
  } | null;
  last_appointment: {
    date: string;
    time: string;
    service: string;
    status: string;
  } | null;
}

export default function AdminClientes() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("admin-list-clients");
      if (!error) setClients((data?.clients || []) as Client[]);
      setLoading(false);
    })();
  }, [user]);

  const filtered = clients.filter((c) => {
    const t = search.trim().toLowerCase();
    if (!t) return true;
    return (
      c.full_name.toLowerCase().includes(t) ||
      (c.email || "").toLowerCase().includes(t) ||
      (c.phone || "").toLowerCase().includes(t)
    );
  });

  const active = clients.filter((c) => c.subscription?.status === "ativo").length;
  const withAppts = clients.filter((c) => c.last_appointment).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-display gold-text">Clientes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Veja informações de cada cliente: assinatura, último agendamento e contato.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total de Clientes" value={String(clients.length)} icon={Users} index={0} />
        <StatCard title="Assinantes Ativos" value={String(active)} icon={Crown} index={1} />
        <StatCard title="Com Agendamento" value={String(withAppts)} icon={CalendarCheck} index={2} />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, email ou telefone"
            className="bg-secondary border-border pl-9"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando clientes...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhum cliente encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((c, i) => (
            <motion.div
              key={c.user_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-card border border-border rounded-lg p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-xl tracking-wide">{c.full_name}</h3>
                  <div className="flex flex-col gap-1 mt-1 text-xs text-muted-foreground">
                    {c.email && (
                      <span className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {c.email}</span>
                    )}
                    {c.phone && (
                      <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {c.phone}</span>
                    )}
                  </div>
                </div>
                {c.subscription && (
                  <span
                    className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${
                      c.subscription.status === "ativo"
                        ? "bg-success/10 text-success"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {c.subscription.status}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Assinatura</p>
                  {c.subscription ? (
                    <div>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Crown className="h-3.5 w-3.5 text-primary" /> {c.subscription.plan_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        R$ {c.subscription.plan_price.toFixed(2)}
                      </p>
                      {c.subscription.expires_at && (
                        <p className="text-[10px] text-muted-foreground">
                          Vence: {new Date(c.subscription.expires_at).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sem plano</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Último Agendamento</p>
                  {c.last_appointment ? (
                    <div>
                      <p className="text-sm font-medium">{c.last_appointment.service}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.last_appointment.date).toLocaleDateString("pt-BR")} às {c.last_appointment.time}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize">{c.last_appointment.status}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Nenhum</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
