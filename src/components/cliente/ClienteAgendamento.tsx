import { useEffect, useMemo, useState } from "react";
import { Calendar, Clock, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useClientBarbershop } from "@/hooks/useClientBarbershop";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TIME_SLOTS = [
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
  const [tipo, setTipo] = useState<"plano" | "avulso">("avulso");
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [busyTimes, setBusyTimes] = useState<Set<string>>(new Set());

  // Carrega serviços, barbeiros e estado da assinatura
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

  useEffect(() => {
    if (!user || !shop) { setHasActivePlan(false); return; }
    (async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .in("status", ["ativo", "cancelando"])
        .limit(1);
      const active = (data || []).length > 0;
      setHasActivePlan(active);
      setTipo(active ? "plano" : "avulso");
    })();
  }, [user, shop]);

  // Carrega horários ocupados para a data/barbeiro selecionados
  useEffect(() => {
    if (!shop || !date) { setBusyTimes(new Set()); return; }
    (async () => {
      let q = supabase
        .from("appointments")
        .select("appointment_time, barber_id")
        .eq("barbershop_id", shop.id)
        .eq("appointment_date", date)
        .neq("status", "cancelado");
      if (barberId) q = q.eq("barber_id", barberId);
      const { data } = await q;
      const set = new Set((data || []).map((a: any) => (a.appointment_time || "").slice(0, 5)));
      setBusyTimes(set);
      if (time && set.has(time)) setTime("");
    })();
  }, [shop, date, barberId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !shop) { toast.error("Barbearia indisponível"); return; }
    const svc = services.find(s => s.id === serviceId);
    const brb = barbers.find(b => b.id === barberId);
    if (!svc || !brb) return;
    if (busyTimes.has(time)) { toast.error("Horário já reservado"); return; }
    setLoading(true);
    try {
      const tipoLabel = tipo === "plano" ? "Plano de assinatura" : "Avulso (pago no balcão)";
      const notes = `${user.email || "Cliente"}||||${tipoLabel}`;
      const { error } = await supabase.from("appointments").insert({
        user_id: user.id,
        service: svc.name,
        barber: brb.name,
        barber_id: brb.id,
        price: tipo === "plano" ? 0 : svc.price,
        appointment_date: date,
        appointment_time: time,
        owner_id: shop.owner_id,
        barbershop_id: shop.id,
        status: "pendente",
        notes,
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
  const availableSlots = useMemo(() => TIME_SLOTS.filter(t => !busyTimes.has(t)), [busyTimes]);

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
            {/* Tipo: plano ou avulso */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Tipo de atendimento</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => hasActivePlan && setTipo("plano")}
                  disabled={!hasActivePlan}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all",
                    tipo === "plano" ? "border-primary bg-primary/10" : "border-border bg-secondary",
                    !hasActivePlan && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <Sparkles className="h-4 w-4 text-primary mb-1" />
                  <p className="text-sm font-medium">Plano</p>
                  <p className="text-[10px] text-muted-foreground">
                    {hasActivePlan ? "Incluso na assinatura" : "Sem plano ativo"}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setTipo("avulso")}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all",
                    tipo === "avulso" ? "border-primary bg-primary/10" : "border-border bg-secondary",
                  )}
                >
                  <Wallet className="h-4 w-4 text-primary mb-1" />
                  <p className="text-sm font-medium">Avulso</p>
                  <p className="text-[10px] text-muted-foreground">Pago no balcão</p>
                </button>
              </div>
            </div>

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

            <Select value={time} onValueChange={setTime} required disabled={!date}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder={date ? "Horário disponível" : "Escolha a data primeiro"} />
              </SelectTrigger>
              <SelectContent>
                {availableSlots.length === 0 ? (
                  <div className="px-2 py-3 text-xs text-muted-foreground text-center">Sem horários livres</div>
                ) : availableSlots.map(t => (
                  <SelectItem key={t} value={t}>
                    <span className="flex items-center gap-2"><Clock className="h-3 w-3" /> {t}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedSvc && (
              <p className="text-xs text-muted-foreground text-center">
                {tipo === "plano" ? (
                  <>Atendimento <span className="text-primary font-medium">incluso no plano</span></>
                ) : (
                  <>Total: <span className="gold-text font-medium">{selectedSvc.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></>
                )}
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
