import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const timeSlots = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"];

interface Appointment {
  id: string;
  service: string;
  barber: string;
  appointment_time: string;
  appointment_date: string;
  status: string;
  notes: string | null;
  user_id: string;
  profiles?: { full_name: string } | null;
}

export default function Agendamento() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const fetchAppointments = async () => {
    const { data } = await supabase
      .from("appointments")
      .select("*, profiles(full_name)")
      .eq("appointment_date", selectedDate)
      .order("appointment_time");
    if (data) setAppointments(data as any);
  };

  useEffect(() => { fetchAppointments(); }, [selectedDate]);

  const handleStatusChange = async (id: string, status: string) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    toast.success("Status atualizado!");
    fetchAppointments();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Agendamento removido!");
    fetchAppointments();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-display gold-text">Agendamento</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie os horários do dia</p>
        </div>
        <div className="flex gap-3 items-center">
          <Input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-secondary border-border w-auto"
          />
        </div>
      </div>

      <div className="grid gap-3">
        {appointments.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Nenhum agendamento para esta data.</p>
        )}
        {appointments.map((app, i) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-lg p-4 flex items-center justify-between hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">{(app.profiles as any)?.full_name || "Cliente"}</p>
                <p className="text-sm text-muted-foreground">{app.service} • {app.barber}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-display tracking-wide">{app.appointment_time}</span>
              <Select value={app.status} onValueChange={(v) => handleStatusChange(app.id, v)}>
                <SelectTrigger className="w-[130px] bg-secondary border-border text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
              <button onClick={() => handleDelete(app.id)} className="p-1 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
