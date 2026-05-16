import { useEffect, useState } from "react";
import { Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClientBarbershop } from "@/hooks/useClientBarbershop";
import { toast } from "sonner";

const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00",
];

interface SvcOpt { id: string; name: string; price: number }
interface BarberOpt { id: string; name: string }

export function ClienteAgendamento() {
  const { user } = useAuth();
  const { shop } = useClientBarbershop();
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<SvcOpt[]>([]);
  const [barbers, setBarbers] = useState<BarberOpt[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    if (!shop) { setServices([]); setBarbers([]); return; }
    (async () => {
      const [{ data: svc }, { data: brb }] = await Promise.all([
        supabase.from("services").select("id,name,price").eq("owner_id", shop.owner_id).eq("active", true).order("name"),
        supabase.from("barbers").select("id,name").eq("owner_id", shop.owner_id).eq("active", true).order("name"),
      ]);
      setServices((svc || []).map((s: any) => ({ ...s, price: Number(s.price) })));
      setBarbers(brb || []);
    })();
  }, [shop]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !shop) { toast.error("Barbearia indisponível"); return; }
    const svc = services.find(s => s.id === serviceId);
    const brb = barbers.find(b => b.id === barberId);
    if (!svc || !brb) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("appointments").insert({
        user_id: user.id,
        service: svc.name,
        barber: brb.name,
        barber_id: brb.id,
        price: svc.price,
        appointment_date: date,
        appointment_time: time,
        owner_id: shop.owner_id,
        barbershop_id: shop.id,
        status: "pendente",
      });
      if (error) throw error;
      toast.success("Agendamento enviado! Aguarde a confirmação.");
      setServiceId(""); setBarberId(""); setDate(""); setTime("");
    } catch (err: any) {
      toast.error(err.message || "Erro ao agendar");
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const selectedSvc = services.find(s => s.id === serviceId);

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

        {services.length === 0 || barbers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Esta barbearia ainda não cadastrou {services.length === 0 ? "serviços" : "barbeiros"}.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select value={serviceId} onValueChange={setServiceId} required>
              <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Serviço" /></SelectTrigger>
              <SelectContent>
                {services.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — {s.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={barberId} onValueChange={setBarberId} required>
              <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Barbeiro" /></SelectTrigger>
              <SelectContent>
                {barbers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Input type="date" value={date} onChange={e => setDate(e.target.value)} min={today} required className="bg-secondary border-border" />

            <Select value={time} onValueChange={setTime} required>
              <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Horário" /></SelectTrigger>
              <SelectContent>
                {timeSlots.map(t => (
                  <SelectItem key={t} value={t}>
                    <span className="flex items-center gap-2"><Clock className="h-3 w-3" /> {t}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedSvc && (
              <p className="text-xs text-muted-foreground text-center">
                Total: <span className="gold-text font-medium">{selectedSvc.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading || !serviceId || !barberId || !date || !time}>
              {loading ? "Agendando..." : "Confirmar Agendamento"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
