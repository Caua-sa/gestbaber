import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Plus, Trash2, User, Scissors, Phone, CalendarDays, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const TIME_SLOTS = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30"];
const SERVICES = ["Corte","Barba","Corte + Barba","Pigmentação","Sobrancelha","Combo Completo"];

interface Appointment {
  id: string;
  service: string;
  barber: string;
  appointment_time: string;
  appointment_date: string;
  status: string;
  notes: string | null;
  user_id: string;
  owner_id: string | null;
  barbershop_id: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  pendente:   { label: "Pendente",   classes: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  confirmado: { label: "Confirmado", classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  cancelado:  { label: "Cancelado",  classes: "bg-rose-500/10 text-rose-400 border-rose-500/30 line-through" },
  concluido:  { label: "Concluído",  classes: "bg-primary/10 text-primary border-primary/30" },
};

function parseNote(notes: string | null) {
  if (!notes) return { name: "Cliente", phone: "", obs: "" };
  const [name = "Cliente", phone = "", obs = ""] = notes.split("||");
  return { name, phone, obs };
}

function formatDateLong(d: Date) {
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function Agendamento() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [form, setForm] = useState({
    client_name: "",
    client_phone: "",
    service: SERVICES[0],
    barber: "",
    appointment_time: "",
    notes: "",
  });

  const dateISO = useMemo(() => toISO(selectedDate), [selectedDate]);

  const getOwnedBarbershopId = async () => {
    if (!user) return null;
    const { data } = await supabase
      .from("barbershops")
      .select("id")
      .eq("owner_id", user.id)
      .eq("active", true)
      .maybeSingle();
    return data?.id || null;
  };

  const fetchAppointments = async () => {
    if (!user) return;
    setLoading(true);
    const shopId = await getOwnedBarbershopId();
    let query = supabase
      .from("appointments")
      .select("*")
      .eq("appointment_date", dateISO)
      .order("appointment_time");

    query = shopId ? query.or(`owner_id.eq.${user.id},barbershop_id.eq.${shopId}`) : query.eq("owner_id", user.id);

    const { data } = await query;
    setAppointments(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAppointments(); }, [dateISO, user]);

  const handleStatusChange = async (id: string, status: string) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    toast.success("Status atualizado");
    fetchAppointments();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este agendamento?")) return;
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Removido");
    fetchAppointments();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const notes = `${form.client_name}||${form.client_phone}||${form.notes}`;
    const shopId = await getOwnedBarbershopId();
    const { error } = await supabase.from("appointments").insert({
      user_id: user.id, // admin acts as the owner; client info kept in notes
      owner_id: user.id,
      barbershop_id: shopId,
      service: form.service,
      barber: form.barber || "Barbeiro",
      appointment_date: dateISO,
      appointment_time: form.appointment_time,
      status: "confirmado",
      notes,
    });
    setSaving(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Agendamento criado!");
    setOpen(false);
    setForm({ client_name: "", client_phone: "", service: SERVICES[0], barber: "", appointment_time: "", notes: "" });
    fetchAppointments();
  };

  const shiftDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  };

  const occupiedTimes = new Set(appointments.map(a => a.appointment_time?.slice(0, 5)));

  // Build a 7-day strip
  const weekStrip = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  }, []);

  const stats = useMemo(() => ({
    total: appointments.length,
    confirmed: appointments.filter(a => a.status === "confirmado").length,
    pending: appointments.filter(a => a.status === "pendente").length,
    done: appointments.filter(a => a.status === "concluido").length,
  }), [appointments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-display gold-text">Agendamento</h1>
          <p className="text-muted-foreground text-sm mt-1 capitalize">{formatDateLong(selectedDate)}</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gold-gradient text-primary-foreground shadow-lg">
              <Plus className="mr-2 h-4 w-4" /> Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl gold-text">Novo Agendamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Cliente *</label>
                  <Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} required placeholder="Nome do cliente" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Telefone</label>
                  <Input value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} placeholder="(00) 00000-0000" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Serviço *</label>
                  <Select value={form.service} onValueChange={(v) => setForm({ ...form, service: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Barbeiro</label>
                  <Input value={form.barber} onChange={(e) => setForm({ ...form, barber: e.target.value })} placeholder="Nome do barbeiro" />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Horário *</label>
                <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1">
                  {TIME_SLOTS.map(t => {
                    const taken = occupiedTimes.has(t);
                    const selected = form.appointment_time === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        disabled={taken}
                        onClick={() => setForm({ ...form, appointment_time: t })}
                        className={cn(
                          "py-1.5 rounded-md text-xs font-medium transition-all border",
                          taken && "bg-muted/30 text-muted-foreground/50 cursor-not-allowed border-transparent line-through",
                          !taken && !selected && "bg-secondary border-border hover:border-primary/50",
                          selected && "gold-gradient text-primary-foreground border-primary shadow-md scale-105",
                        )}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Observações</label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Opcional" />
              </div>

              <Button type="submit" className="w-full gold-gradient text-primary-foreground" disabled={saving || !form.appointment_time}>
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Confirmar agendamento"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, icon: CalendarDays },
          { label: "Confirmados", value: stats.confirmed, icon: CheckCircle2 },
          { label: "Pendentes", value: stats.pending, icon: Clock },
          { label: "Concluídos", value: stats.done, icon: Scissors },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"
          >
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-display tracking-wide">{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Date strip */}
      <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => shiftDay(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="flex-1 grid grid-cols-7 gap-1">
          {weekStrip.map(d => {
            const iso = toISO(d);
            const active = iso === dateISO;
            return (
              <button
                key={iso}
                onClick={() => setSelectedDate(d)}
                className={cn(
                  "py-2 rounded-lg text-center transition-all border",
                  active ? "gold-gradient text-primary-foreground border-primary shadow-md" : "bg-secondary/30 border-transparent hover:border-primary/30"
                )}
              >
                <div className="text-[10px] uppercase tracking-widest opacity-70">{d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}</div>
                <div className="font-display text-lg leading-tight">{d.getDate()}</div>
              </button>
            );
          })}
        </div>
        <Button variant="ghost" size="icon" onClick={() => shiftDay(1)}><ChevronRight className="h-4 w-4" /></Button>
        <Input
          type="date"
          value={dateISO}
          onChange={e => setSelectedDate(new Date(e.target.value + "T00:00:00"))}
          className="w-auto bg-secondary border-border ml-2 hidden sm:block"
        />
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum agendamento para este dia</p>
            <Button onClick={() => setOpen(true)} variant="link" className="text-primary mt-2">
              <Plus className="h-4 w-4 mr-1" /> Adicionar o primeiro
            </Button>
          </div>
        ) : (
          <AnimatePresence>
            {appointments.map((app, i) => {
              const note = parseNote(app.notes);
              const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.pendente;
              return (
                <motion.div
                  key={app.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors group"
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex flex-col items-center justify-center w-16 shrink-0 border-r border-border pr-4">
                      <span className="font-display text-2xl gold-text leading-none">{app.appointment_time?.slice(0, 5)}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{note.name}</p>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", cfg.classes)}>{cfg.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1"><Scissors className="h-3 w-3" />{app.service}</span>
                        {app.barber && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{app.barber}</span>}
                        {note.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{note.phone}</span>}
                      </div>
                      {note.obs && <p className="text-xs text-muted-foreground/80 mt-1 italic truncate">"{note.obs}"</p>}
                    </div>

                    <div className="flex items-center gap-2">
                      <Select value={app.status} onValueChange={(v) => handleStatusChange(app.id, v)}>
                        <SelectTrigger className="w-[130px] bg-secondary border-border text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="confirmado">Confirmado</SelectItem>
                          <SelectItem value="concluido">Concluído</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                      <button
                        onClick={() => handleDelete(app.id)}
                        className="p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
