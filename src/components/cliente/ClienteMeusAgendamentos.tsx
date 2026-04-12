import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ClienteMeusAgendamentos() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Tables<"appointments">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("appointments")
      .select("*")
      .eq("user_id", user.id)
      .order("appointment_date", { ascending: false })
      .then(({ data }) => {
        if (data) setAppointments(data);
        setLoading(false);
      });
  }, [user]);

  if (loading) return <div className="text-center text-muted-foreground py-8">Carregando...</div>;

  if (appointments.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">Nenhum agendamento encontrado</p>
        <p className="text-xs text-muted-foreground mt-1">Faça seu primeiro agendamento!</p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pendente: "bg-warning/10 text-warning",
    confirmado: "bg-success/10 text-success",
    cancelado: "bg-destructive/10 text-destructive",
    concluido: "bg-primary/10 text-primary",
  };

  return (
    <div className="space-y-3">
      {appointments.map((app, i) => (
        <motion.div
          key={app.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-card border border-border rounded-lg p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">{app.service}</p>
              <p className="text-sm text-muted-foreground">
                {app.barber} • {format(new Date(app.appointment_date + "T12:00:00"), "dd MMM yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-display tracking-wide">{app.appointment_time}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${statusColors[app.status] || ""}`}>
              {app.status}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
