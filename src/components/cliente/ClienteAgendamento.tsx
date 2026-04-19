import { useState } from "react";
import { Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00",
];

const services = ["Corte", "Barba", "Corte + Barba", "Corte Degradê", "Combo Completo"];
const barbers = ["João", "Lucas"];

export function ClienteAgendamento() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [service, setService] = useState("");
  const [barber, setBarber] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const { data: shop } = await supabase.from("barbershops").select("id, owner_id").eq("active", true).limit(1).maybeSingle();
      const { error } = await supabase.from("appointments").insert({
        user_id: user.id,
        service,
        barber,
        appointment_date: date,
        appointment_time: time,
        owner_id: shop?.owner_id,
        barbershop_id: shop?.id,
      });
      if (error) throw error;
      toast.success("Agendamento realizado com sucesso!");
      setService("");
      setBarber("");
      setDate("");
      setTime("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao agendar");
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl tracking-wide">Novo Agendamento</h2>
            <p className="text-xs text-muted-foreground">Escolha o serviço e horário</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Select value={service} onValueChange={setService} required>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Serviço" />
            </SelectTrigger>
            <SelectContent>
              {services.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={barber} onValueChange={setBarber} required>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Barbeiro" />
            </SelectTrigger>
            <SelectContent>
              {barbers.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={today}
            required
            className="bg-secondary border-border"
          />

          <Select value={time} onValueChange={setTime} required>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Horário" />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map((t) => (
                <SelectItem key={t} value={t}>
                  <span className="flex items-center gap-2">
                    <Clock className="h-3 w-3" /> {t}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !service || !barber || !date || !time}
          >
            {loading ? "Agendando..." : "Confirmar Agendamento"}
          </Button>
        </form>
      </div>
    </div>
  );
}
