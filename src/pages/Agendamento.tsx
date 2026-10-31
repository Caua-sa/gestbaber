import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Plus, Trash2, User, Scissors, Phone, CalendarDays, ChevronLeft, ChevronRight, CheckCircle2, Loader2, Zap, FileText, Bell, Volume2, VolumeX, UserPlus, Lock } from "lucide-react";
import { generateReceiptPDF } from "@/lib/receipt";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useAccountOwner } from "@/hooks/useAccountOwner";
import { cn } from "@/lib/utils";

const TIME_SLOTS = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30"];

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
  price: number | null;
}
interface SvcOpt { id: string; name: string; price: number }
interface BarberOpt { id: string; name: string }

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  pendente:   { label: "Pendente",   classes: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
  confirmado: { label: "Confirmado", classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  cancelado:  { label: "Cancelado",  classes: "bg-rose-500/10 text-rose-400 border-rose-500/30 line-through" },
  concluido:  { label: "Concluído",  classes: "bg-primary/10 text-primary border-primary/30" },
  bloqueado:  { label: "Fechado",    classes: "bg-muted text-muted-foreground border-border" },
};

function parseNote(notes: string | null) {
  if (!notes) return { name: "Cliente", phone: "", obs: "" };
  const clean = notes.replace(/\s*\[appt:[0-9a-f-]+\]\s*$/i, "").replace(/\s*\[guest\]/g, "");
  const [name = "Cliente", phone = "", obs = ""] = clean.split("||");
  return { name, phone, obs };
}
function formatDateLong(d: Date) { return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }); }
function toISO(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

export default function Agendamento() {
  const { user } = useAuth();
  const { ownerId } = useAccountOwner();
  const [saveApp, setSaveApp] = useState<any>(null);
  const [saveForm, setSaveForm] = useState({ full_name: "", phone: "", email: "", password: "" });
  const [savingClient, setSavingClient] = useState(false);
  const saveAsClient = async (app: any, f: { full_name: string; phone: string; email: string; password: string }) => {
    const saveApp = app; const saveForm = f;
    if (!saveApp || savingClient) return;
    if (!saveForm.full_name.trim()) { toast.error("Informe o nome"); return; }
    const digits = saveForm.phone.replace(/\D/g, "");
    const email = saveForm.email.trim() || `${digits || Date.now()}.${Math.random().toString(36).slice(2, 6)}@cliente.barber`;
    const password = saveForm.password.length >= 6 ? saveForm.password : `Cli${Math.random().toString(36).slice(2, 10)}!9`;
    setSavingClient(true);
    const { data, error } = await supabase.functions.invoke("create-admin-user", {
      body: { action: "create", email, password, full_name: saveForm.full_name.trim(), phone: digits || null, role: "user" },
    });
    const newId = (data as any)?.user?.id;
    if (error || !newId) { setSavingClient(false); toast.error((data as any)?.error || error?.message || "Erro ao salvar cliente"); return; }
    await supabase.from("appointments").update({ user_id: newId }).eq("id", saveApp.id);
    setSavingClient(false); setSaveApp(null);
    toast.success("Cliente salvo na aba Clientes!");
    fetchAppointments();
  };
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<SvcOpt[]>([]);
  const [barbers, setBarbers] = useState<BarberOpt[]>([]);
  const [open, setOpen] = useState(false);
  const [walkOpen, setWalkOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [shopId, setShopId] = useState<string | null>(null);

  const [form, setForm] = useState({ client_name: "", client_phone: "", service_id: "", barber_id: "", appointment_time: "", notes: "" });
  const [walk, setWalk] = useState({ client_name: "", service_id: "", barber_id: "", date: "", time: "" });

  const [clientList, setClientList] = useState<{ user_id: string; full_name: string; phone: string | null }[]>([]);
  const [clientUserId, setClientUserId] = useState<string | null>(null);
  const [showSugg, setShowSugg] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [block, setBlock] = useState<{ barber_id: string; times: string[]; reason: string }>({ barber_id: "all", times: [], reason: "" });
  useEffect(() => {
    if (!open || clientList.length) return;
    supabase.functions.invoke("admin-list-clients").then(({ data }) => setClientList((data?.clients || []) as any));
  }, [open]);
  const suggestions = useMemo(() => {
    const q = form.client_name.trim().toLowerCase();
    if (q.length < 2 || clientUserId) return [];
    const qd = q.replace(/\D/g, "");
    return clientList.filter(c => (c.full_name || "").toLowerCase().includes(q) || (qd.length >= 3 && (c.phone || "").replace(/\D/g, "").includes(qd))).slice(0, 6);
  }, [form.client_name, clientList, clientUserId]);
  const handleBlock = async () => {
    if (!user || !ownerId || block.times.length === 0) return;
    const targets = block.barber_id === "all" ? barbers : barbers.filter(b => b.id === block.barber_id);
    if (targets.length === 0) { toast.error("Cadastre um barbeiro primeiro"); return; }
    const rows = targets.flatMap(b => block.times
      .filter(t => !appointments.some(a => a.status !== "cancelado" && (a as any).barber_id === b.id && a.appointment_time?.slice(0, 5) === t))
      .map(t => ({
        user_id: user.id, owner_id: ownerId, barbershop_id: shopId, service: "Horário fechado", price: 0,
        barber: b.name, barber_id: b.id, appointment_date: dateISO, appointment_time: t,
        status: "bloqueado", notes: `Fechado||||${block.reason}`,
      })));
    if (rows.length === 0) { toast.error("Esses horários já estão ocupados"); return; }
    setSaving(true);
    const { error } = await supabase.from("appointments").insert(rows);
    setSaving(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(`${rows.length} horário(s) fechado(s)`);
    setBlockOpen(false); setBlock({ barber_id: "all", times: [], reason: "" });
    fetchAppointments();
  };
  const [shopInfo, setShopInfo] = useState<{ name: string; address: string | null; phone: string | null } | null>(null);

  const dateISO = useMemo(() => toISO(selectedDate), [selectedDate]);

  const fetchMeta = async () => {
    if (!user || !ownerId) return;
    const { data: shop } = await supabase.from("barbershops").select("id, name, address, phone").eq("owner_id", ownerId).maybeSingle();
    setShopId(shop?.id || null);
    setShopInfo(shop ? { name: shop.name, address: shop.address, phone: shop.phone } : null);
    const [{ data: svc }, { data: brb }] = await Promise.all([
      supabase.from("services").select("id,name,price").eq("owner_id", ownerId).eq("active", true).order("name"),
      supabase.from("barbers").select("id,name").eq("owner_id", ownerId).eq("active", true).order("name"),
    ]);
    setServices((svc || []).map((s: any) => ({ ...s, price: Number(s.price) })));
    setBarbers(brb || []);
  };

  const [profileNames, setProfileNames] = useState<Record<string, { name: string; phone: string | null }>>({});
  const [soundOn, setSoundOn] = useState(true);
  const initialLoadRef = useRef(true);
  const knownIds = useRef<Set<string>>(new Set());

  const playBeep = () => {
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = 880;
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.55);
    } catch { /* ignore */ }
  };

  const fetchProfiles = async (rows: Appointment[]) => {
    const ids = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean)));
    if (ids.length === 0) return;
    const { data } = await supabase.from("profiles").select("user_id, full_name, phone").in("user_id", ids);
    const map: Record<string, { name: string; phone: string | null }> = {};
    (data || []).forEach((p: any) => { map[p.user_id] = { name: p.full_name || "Cliente", phone: p.phone }; });
    setProfileNames(prev => ({ ...prev, ...map }));
  };

  const fetchAppointments = async () => {
    if (!user || !ownerId) return;
    setLoading(true);
    let query = supabase.from("appointments").select("*").eq("appointment_date", dateISO).order("appointment_time");
    query = shopId ? query.or(`owner_id.eq.${ownerId},barbershop_id.eq.${shopId}`) : query.eq("owner_id", ownerId);
    const { data } = await query;
    const rows = (data || []) as Appointment[];
    setAppointments(rows);
    knownIds.current = new Set(rows.map(r => r.id));
    initialLoadRef.current = false;
    fetchProfiles(rows);
    setLoading(false);
  };

  useEffect(() => { fetchMeta(); }, [user, ownerId]);
  useEffect(() => { fetchAppointments(); }, [dateISO, user, ownerId, shopId]);

  // Realtime — novo agendamento cai instantaneamente + som
  useEffect(() => {
    if (!ownerId) return;
    const channel = supabase
      .channel("appointments-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments", filter: `owner_id=eq.${ownerId}` },
        (payload) => {
          const row: any = payload.new || payload.old;
          if (!row || row.appointment_date !== dateISO) return;
          if (payload.eventType === "INSERT") {
            if (!knownIds.current.has(row.id)) {
              knownIds.current.add(row.id);
              if (soundOn && !initialLoadRef.current) playBeep();
              toast.success(`Novo agendamento — ${row.appointment_time?.slice(0,5)}`);
            }
            fetchAppointments();
          } else {
            fetchAppointments();
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ownerId, dateISO, soundOn]);

  const notifyClient = async (app: Appointment) => {
    const { data, error } = await supabase.functions.invoke("appointment-notify", {
      body: { appointment_id: app.id },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Falha ao avisar");
      return;
    }
    toast.success("Cliente avisado no WhatsApp");
  };


  const ensureTransaction = async (app: Appointment) => {
    if (!user || !ownerId) return;
    const tag = `[appt:${app.id}]`;
    const { data: existing } = await supabase
      .from("transactions").select("id").eq("owner_id", ownerId).ilike("notes", `%${tag}%`).maybeSingle();
    if (existing) return;
    const value = Number(app.price || 0);
    if (value <= 0) return;
    await supabase.from("transactions").insert({
      owner_id: ownerId,
      created_by: user.id,
      type: "entrada",
      category: "Cortes",
      description: `Corte - ${app.service}`,
      value,
      transaction_date: app.appointment_date,
      notes: tag,
    });
  };

  const handleStatusChange = async (app: Appointment, status: string) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", app.id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    if (status === "concluido") {
      await ensureTransaction(app);
      toast.success("Atendimento concluído e lançado no financeiro");
    } else {
      toast.success("Status atualizado");
    }
    fetchAppointments();
  };

  const startService = async (app: Appointment, clientName: string) => {
    if (!ownerId) return;
    const { data: ex } = await supabase.from("comandas").select("id").eq("appointment_id", app.id).eq("status", "aberta").maybeSingle();
    if (ex) { toast.info("Este corte já tem uma comanda aberta em Estoque → Conveniência"); return; }
    const { data: c, error } = await supabase.from("comandas")
      .insert({ owner_id: ownerId, customer_name: `${clientName} — ${app.appointment_time?.slice(0, 5)}`, appointment_id: app.id })
      .select("id").single();
    if (error || !c) { toast.error(error?.message || "Erro ao abrir comanda"); return; }
    await supabase.from("comanda_items").insert({ comanda_id: c.id, owner_id: ownerId, product_id: null, name: app.service, unit_price: Number(app.price || 0), quantity: 1 });
    toast.success("Corte iniciado! Comanda aberta — adicione bebidas ou fichas de sinuca em Estoque → Conveniência.");
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
    if (!user || !ownerId) return;
    const svc = services.find(s => s.id === form.service_id);
    const brb = barbers.find(b => b.id === form.barber_id);
    if (!svc) { toast.error("Escolha um serviço"); return; }
    setSaving(true);
    const notes = `${form.client_name}||${form.client_phone}||${form.notes}`;
    const base = {
      owner_id: ownerId, barbershop_id: shopId,
      service: svc.name, price: svc.price,
      barber: brb?.name || "Barbeiro", barber_id: brb?.id || null,
      appointment_date: dateISO, appointment_time: form.appointment_time,
      status: "confirmado", notes,
    };
    let { error } = await supabase.from("appointments").insert({ ...base, user_id: clientUserId || user.id });
    if (error && clientUserId && !/reservado/i.test(error.message)) {
      ({ error } = await supabase.from("appointments").insert({ ...base, user_id: user.id }));
    }
    setSaving(false);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Agendamento criado!");
    setOpen(false);
    setForm({ client_name: "", client_phone: "", service_id: "", barber_id: "", appointment_time: "", notes: "" });
    setClientUserId(null);
    fetchAppointments();
  };

  const handleWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !ownerId) return;
    const svc = services.find(s => s.id === walk.service_id);
    const brb = barbers.find(b => b.id === walk.barber_id);
    if (!svc) { toast.error("Escolha um serviço"); return; }
    setSaving(true);
    const now = new Date();
    const dateStr = walk.date || toISO(now);
    const timeStr = walk.time || `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    const { data, error } = await supabase.from("appointments").insert({
      user_id: user.id, owner_id: ownerId, barbershop_id: shopId,
      service: svc.name, price: svc.price,
      barber: brb?.name || "Avulso", barber_id: brb?.id || null,
      appointment_date: dateStr, appointment_time: timeStr,
      status: "concluido",
      notes: `${walk.client_name || "Avulso"}||||Atendimento avulso`,
    }).select().single();
    if (error || !data) { setSaving(false); toast.error("Erro: " + (error?.message || "")); return; }
    await ensureTransaction(data as Appointment);
    setSaving(false);
    toast.success("Atendimento avulso registrado");
    setWalkOpen(false);
    setWalk({ client_name: "", service_id: "", barber_id: "", date: "", time: "" });
    fetchAppointments();
  };

  const issueReceipt = (app: Appointment) => {
    const note = parseNote(app.notes);
    generateReceiptPDF({
      shopName: shopInfo?.name || "Barbearia",
      shopAddress: shopInfo?.address || undefined,
      shopPhone: shopInfo?.phone || undefined,
      clientName: note.name || "Cliente",
      service: app.service,
      barber: app.barber,
      date: new Date(app.appointment_date + "T00:00:00").toLocaleDateString("pt-BR"),
      time: app.appointment_time?.slice(0, 5) || "",
      price: Number(app.price || 0),
      receiptId: app.id,
    });
  };

  const shiftDay = (delta: number) => { const d = new Date(selectedDate); d.setDate(d.getDate() + delta); setSelectedDate(d); };
  // Ocupado é POR BARBEIRO — cada barbeiro tem sua própria agenda
  const occupiedTimes = new Set(
    appointments
      .filter(a => a.status !== "cancelado" && (!form.barber_id || (a as any).barber_id === form.barber_id))
      .map(a => a.appointment_time?.slice(0, 5))
  );
  const weekStrip = useMemo(() => {
    const today = new Date(); today.setHours(0,0,0,0);
    return Array.from({ length: 7 }).map((_, i) => { const d = new Date(today); d.setDate(today.getDate() + i); return d; });
  }, []);
  const stats = useMemo(() => ({
    total: appointments.length,
    confirmed: appointments.filter(a => a.status === "confirmado").length,
    pending: appointments.filter(a => a.status === "pendente").length,
    done: appointments.filter(a => a.status === "concluido").length,
  }), [appointments]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const noServices = services.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-display gold-text">Agendamento</h1>
          <p className="text-muted-foreground text-sm mt-1 capitalize">{formatDateLong(selectedDate)}</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={() => setSoundOn(v => !v)} title={soundOn ? "Silenciar" : "Ativar som"}>
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
          </Button>
          <Dialog open={walkOpen} onOpenChange={setWalkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={noServices}>
                <Zap className="mr-2 h-4 w-4" /> Atendimento avulso
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl gold-text">Atendimento avulso</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleWalkIn} className="space-y-4 mt-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Cliente</label>
                  <Input value={walk.client_name} onChange={e => setWalk({ ...walk, client_name: e.target.value })} placeholder="Nome (opcional)" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Serviço *</label>
                  <Select value={walk.service_id} onValueChange={v => setWalk({ ...walk, service_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Escolha..." /></SelectTrigger>
                    <SelectContent>
                      {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {fmt(s.price)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Barbeiro</label>
                  <Select value={walk.barber_id} onValueChange={v => setWalk({ ...walk, barber_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Escolha..." /></SelectTrigger>
                    <SelectContent>
                      {barbers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Data</label>
                    <Input type="date" value={walk.date} onChange={e => setWalk({ ...walk, date: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Horário</label>
                    <Input type="time" value={walk.time} onChange={e => setWalk({ ...walk, time: e.target.value })} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Vazio = agora. Para atendimentos retroativos, escolha data e hora passadas. Será lançado no financeiro automaticamente.</p>
                <Button type="submit" className="w-full gold-gradient text-primary-foreground" disabled={saving || !walk.service_id}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Registrando...</> : "Registrar atendimento"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Lock className="mr-2 h-4 w-4" /> Fechar horários</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl gold-text">Fechar agenda</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <p className="text-xs text-muted-foreground capitalize">{formatDateLong(selectedDate)}</p>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Barbeiro</label>
                  <Select value={block.barber_id} onValueChange={(v) => setBlock({ ...block, barber_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os barbeiros</SelectItem>
                      {barbers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs text-muted-foreground">Horários a fechar</label>
                    <button type="button" className="text-xs text-primary" onClick={() => setBlock({ ...block, times: block.times.length === TIME_SLOTS.length ? [] : [...TIME_SLOTS] })}>
                      {block.times.length === TIME_SLOTS.length ? "Limpar" : "Dia inteiro"}
                    </button>
                  </div>
                  <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1">
                    {TIME_SLOTS.map(t => {
                      const sel = block.times.includes(t);
                      return (
                        <button key={t} type="button"
                          onClick={() => setBlock({ ...block, times: sel ? block.times.filter(x => x !== t) : [...block.times, t] })}
                          className={cn("py-1.5 rounded-md text-xs font-medium border transition-all",
                            sel ? "bg-destructive text-destructive-foreground border-destructive" : "bg-secondary border-border hover:border-primary/50")}
                        >{t}</button>
                      );
                    })}
                  </div>
                </div>
                <Input value={block.reason} onChange={(e) => setBlock({ ...block, reason: e.target.value })} placeholder="Motivo (opcional)" />
                <p className="text-xs text-muted-foreground">Para reabrir um horário, apague-o da lista do dia.</p>
                <Button className="w-full gold-gradient text-primary-foreground" disabled={saving || block.times.length === 0} onClick={handleBlock}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Fechar {block.times.length} horário(s)
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gold-gradient text-primary-foreground shadow-lg" disabled={noServices}>
                <Plus className="mr-2 h-4 w-4" /> Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl gold-text">Novo Agendamento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="text-xs text-muted-foreground mb-1 block">Cliente * {clientUserId && <span className="text-primary">· cadastrado</span>}</label>
                    <Input value={form.client_name} autoComplete="off" placeholder="Digite o nome..."
                      onFocus={() => setShowSugg(true)} onBlur={() => setTimeout(() => setShowSugg(false), 150)}
                      onChange={(e) => { setClientUserId(null); setForm({ ...form, client_name: e.target.value }); }} required />
                    {showSugg && suggestions.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 mt-1 rounded-md border border-border bg-popover shadow-lg max-h-48 overflow-y-auto">
                        {suggestions.map(c => (
                          <button key={c.user_id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-secondary"
                            onMouseDown={(e) => { e.preventDefault(); setClientUserId(c.user_id); setForm({ ...form, client_name: c.full_name, client_phone: c.phone || form.client_phone }); setShowSugg(false); }}>
                            <div className="font-medium">{c.full_name}</div>
                            {c.phone && <div className="text-xs text-muted-foreground">{c.phone}</div>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Telefone</label>
                    <Input value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} placeholder="(00) 00000-0000" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Serviço *</label>
                    <Select value={form.service_id} onValueChange={(v) => setForm({ ...form, service_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Escolha..." /></SelectTrigger>
                      <SelectContent>
                        {services.map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {fmt(s.price)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Barbeiro</label>
                    <Select value={form.barber_id} onValueChange={(v) => setForm({ ...form, barber_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Escolha..." /></SelectTrigger>
                      <SelectContent>
                        {barbers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
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
                          key={t} type="button" disabled={taken}
                          onClick={() => setForm({ ...form, appointment_time: t })}
                          className={cn(
                            "py-1.5 rounded-md text-xs font-medium transition-all border",
                            taken && "bg-muted/30 text-muted-foreground/50 cursor-not-allowed border-transparent line-through",
                            !taken && !selected && "bg-secondary border-border hover:border-primary/50",
                            selected && "gold-gradient text-primary-foreground border-primary shadow-md scale-105",
                          )}
                        >{taken ? `✕ ${t}` : t}</button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Observações</label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                </div>

                <Button type="submit" className="w-full gold-gradient text-primary-foreground" disabled={saving || !form.appointment_time || !form.service_id}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Confirmar agendamento"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {noServices && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-lg p-4 text-sm">
          Cadastre seus <a href="/admin/servicos" className="underline">cortes &amp; preços</a> e <a href="/admin/barbeiros" className="underline">barbeiros</a> para começar a usar a agenda.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, icon: CalendarDays },
          { label: "Confirmados", value: stats.confirmed, icon: CheckCircle2 },
          { label: "Pendentes", value: stats.pending, icon: Clock },
          { label: "Concluídos", value: stats.done, icon: Scissors },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><s.icon className="h-4 w-4 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-display tracking-wide">{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => shiftDay(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="flex-1 grid grid-cols-7 gap-1">
          {weekStrip.map(d => {
            const iso = toISO(d);
            const active = iso === dateISO;
            return (
              <button key={iso} onClick={() => setSelectedDate(d)}
                className={cn("py-2 rounded-lg text-center transition-all border",
                  active ? "gold-gradient text-primary-foreground border-primary shadow-md" : "bg-secondary/30 border-transparent hover:border-primary/30"
                )}>
                <div className="text-[10px] uppercase tracking-widest opacity-70">{d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}</div>
                <div className="font-display text-lg leading-tight">{d.getDate()}</div>
              </button>
            );
          })}
        </div>
        <Button variant="ghost" size="icon" onClick={() => shiftDay(1)}><ChevronRight className="h-4 w-4" /></Button>
        <Input type="date" value={dateISO} onChange={e => setSelectedDate(new Date(e.target.value + "T00:00:00"))} className="w-auto bg-secondary border-border ml-2 hidden sm:block" />
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : appointments.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum agendamento para este dia</p>
          </div>
        ) : (
          <AnimatePresence>
            {appointments.map((app, i) => {
              const note = parseNote(app.notes);
              const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.pendente;
              const isGuest = !!app.user_id && app.user_id === ownerId;
              const profile = app.user_id && !isGuest ? profileNames[app.user_id] : undefined;
              const displayName = profile?.name || note.name;
              const displayPhone = note.phone || profile?.phone || "";
              return (
                <motion.div key={app.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.04 }}
                  className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors group">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex flex-col items-center justify-center w-16 shrink-0 border-r border-border pr-4">
                      <span className="font-display text-2xl gold-text leading-none">{app.appointment_time?.slice(0, 5)}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-primary" />{displayName}</p>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full border", cfg.classes)}>{cfg.label}</span>
                        {app.price != null && Number(app.price) > 0 && (
                          <span className="text-[10px] text-primary font-medium">{fmt(Number(app.price))}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1"><Scissors className="h-3 w-3" />{app.service}</span>
                        {app.barber && <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{app.barber}</span>}
                        {displayPhone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{displayPhone}</span>}
                      </div>
                      {note.obs && <p className="text-xs text-muted-foreground/80 mt-1 italic truncate">"{note.obs}"</p>}
                    </div>

                    <div className="flex items-center gap-2">
                      {app.status === "pendente" && (
                        <Button size="sm" onClick={() => handleStatusChange(app, "confirmado")} className="h-8 gap-1.5 gold-gradient text-primary-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar
                        </Button>
                      )}
                      {(app.status === "confirmado" || app.status === "pendente") && (
                        <Button size="sm" onClick={() => startService(app, displayName)} className="h-8 gap-1.5">
                          <Scissors className="h-3.5 w-3.5" /> Iniciar corte
                        </Button>
                      )}
                      {isGuest && (
                        <Button variant="outline" size="sm" disabled={savingClient} onClick={() => saveAsClient(app, { full_name: note.name, phone: note.phone, email: "", password: "" })} className="h-8 gap-1.5">
                          <UserPlus className="h-3.5 w-3.5" /> Salvar cliente
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => notifyClient(app)} title="Avisar cliente no WhatsApp" className="h-8 gap-1.5">
                        <Bell className="h-3.5 w-3.5" /> Avisar
                      </Button>
                      <Select value={app.status} onValueChange={(v) => handleStatusChange(app, v)}>
                        <SelectTrigger className="w-[130px] bg-secondary border-border text-xs h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="confirmado">Confirmado</SelectItem>
                          <SelectItem value="concluido">Concluído</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                      {app.status === "concluido" && Number(app.price) > 0 && (
                        <button onClick={() => issueReceipt(app)} title="Gerar recibo PDF" className="p-2 text-muted-foreground hover:text-primary transition">
                          <FileText className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(app.id)} className="p-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition">
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
