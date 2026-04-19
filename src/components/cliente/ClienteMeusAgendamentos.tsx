import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, CalendarDays, Scissors, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { format, isToday, isTomorrow, isPast, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusStyle: Record<string, string> = {
  pendente: "bg-warning/10 text-warning border-warning/20",
  confirmado: "bg-success/10 text-success border-success/20",
  cancelado: "bg-destructive/10 text-destructive border-destructive/20",
  concluido: "bg-primary/10 text-primary border-primary/20",
};

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
      <div className="text-center py-16">
        <CalendarDays className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
        <p className="text-foreground font-medium">Nenhum agendamento ainda</p>
        <p className="text-xs text-muted-foreground mt-1">Faça seu primeiro agendamento na aba "Agendar"</p>
      </div>
    );
  }

  const upcoming = appointments.filter(a => !isPast(parseISO(a.appointment_date + "T23:59:00")));
  const past = appointments.filter(a => isPast(parseISO(a.appointment_date + "T23:59:00")));

  const renderCard = (app: Tables<"appointments">, i: number) => {
    const date = parseISO(app.appointment_date + "T12:00:00");
    const dayLabel = isToday(date) ? "Hoje" : isTomorrow(date) ? "Amanhã" : format(date, "EEE", { locale: ptBR });
    return (
      <motion.div
        key={app.id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.04 }}
        className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 transition-colors"
      >
        <div className="text-center bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg p-2 min-w-[60px] border border-primary/10">
          <p className="text-2xl font-display gold-text leading-none">{format(date, "dd")}</p>
          <p className="text-[10px] uppercase text-muted-foreground tracking-wider">{format(date, "MMM", { locale: ptBR })}</p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium flex items-center gap-1.5">
            <Scissors className="h-3.5 w-3.5 text-primary" /> {app.service}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1"><User className="h-3 w-3" /> {app.barber}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {app.appointment_time}</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{dayLabel}</p>
        </div>
        <span className={`text-[10px] px-2 py-1 rounded-full border capitalize ${statusStyle[app.status] || "border-border text-muted-foreground"}`}>
          {app.status}
        </span>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Próximos</h3>
          <div className="space-y-2">{upcoming.map(renderCard)}</div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Histórico</h3>
          <div className="space-y-2 opacity-70">{past.map(renderCard)}</div>
        </div>
      )}
    </div>
  );
}
