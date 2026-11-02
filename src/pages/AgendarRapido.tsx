import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, User, Calendar, Clock, Check, ArrowRight, ArrowLeft, Phone, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import BookingServicePicker from "@/components/BookingServicePicker";
import { getBookingCombo } from "@/lib/bookingCombo";

const SLOTS = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30","18:00","18:30","19:00"];

interface Shop { id: string; owner_id: string; name: string; logo_url: string | null; description: string | null }

export default function AgendarRapido() {
  const { slug } = useParams();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<{ id: string; name: string; price: number }[]>([]);
  const [barbers, setBarbers] = useState<{ id: string; name: string; photo_url: string | null }[]>([]);
  const [step, setStep] = useState(0);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const combo = getBookingCombo(services, serviceIds);
  const service = combo.name;
  const [barber, setBarber] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [known, setKnown] = useState<string | null>(null);
  const [sessionUid, setSessionUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id;
      if (!uid) return;
      setSessionUid(uid);
      const { data: p } = await supabase.from("profiles").select("full_name,phone").eq("user_id", uid).maybeSingle();
      if (p?.full_name) { setName(p.full_name); setKnown(p.full_name); }
      if (p?.phone) setPhone(p.phone);
    });
  }, []);
  const lookupPhone = async (v: string) => {
    const digits = v.replace(/\D/g, "");
    if (!shop || digits.length < 10) { setKnown(null); return; }
    const { data } = await supabase.rpc("find_client_by_phone" as any, { _owner_id: shop.owner_id, _phone: digits });
    const row = Array.isArray(data) ? data[0] : null;
    if (row?.full_name) { setKnown(row.full_name); setName(row.full_name); } else setKnown(null);
  };

  useEffect(() => {
    (async () => {
      if (!slug) { setLoading(false); return; }
      const { data: b } = await supabase.from("barbershops").select("id,owner_id,name,logo_url,description").eq("slug", slug).eq("active", true).maybeSingle();
      if (b) {
        setShop(b as Shop);
        const [{ data: s }, { data: br }] = await Promise.all([
          supabase.from("services").select("id,name,price").eq("owner_id", b.owner_id).eq("active", true).order("name"),
          supabase.from("barbers").select("id,name,photo_url").eq("owner_id", b.owner_id).eq("active", true).order("name"),
        ]);
        setServices((s || []).map((x: any) => ({ ...x, price: Number(x.price) })));
        setBarbers(br || []);
      }
      setLoading(false);
    })();
  }, [slug]);

  const [busy, setBusy] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!shop || !date) { setBusy(new Set()); return; }
    const brb = barbers.find(b => b.name === barber);
    (async () => {
      let q = supabase.from("tv_agenda_slots" as any).select("appointment_time,barber_id,status").eq("barbershop_id", shop.id).eq("appointment_date", date);
      if (brb) q = q.eq("barber_id", brb.id);
      const { data } = await q;
      const set = new Set(((data as any[]) || []).filter(a => a.status !== "cancelado").map(a => String(a.appointment_time || "").slice(0, 5)));
      setBusy(set);
      if (set.has(time)) setTime("");
    })();
  }, [shop, date, barber, barbers]);

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return d;
  }), []);

  const steps = ["Serviço", "Barbeiro", "Horário", "Seus dados"];
  const canNext = [!!service, !!barber, !!date && !!time, name.trim().length > 1][step];

  const storeKey = `agendar_${slug}`;
  const [mine, setMine] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem(`agendar_${slug}`) || "[]"); } catch { return []; } });
  const [mineStatus, setMineStatus] = useState<Record<string, string>>({});
  const [openSvc, setOpenSvc] = useState(false);
  useEffect(() => {
    if (!shop || mine.length === 0) return;
    const load = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase.from("tv_agenda_slots" as any).select("appointment_date,appointment_time,barber_id,status").eq("barbershop_id", shop.id).gte("appointment_date", today);
      const m: Record<string, string> = {};
      ((data as any[]) || []).forEach(a => { m[`${a.appointment_date}|${String(a.appointment_time).slice(0, 5)}|${a.barber_id}`] = a.status; });
      setMineStatus(m);
    };
    load(); const t = setInterval(load, 30000); return () => clearInterval(t);
  }, [shop, mine]);
  const saveMine = () => {
    const brb = barbers.find(b => b.name === barber);
    const next = [{ service, barber, barber_id: brb?.id, date, time }, ...mine].slice(0, 10);
    setMine(next); localStorage.setItem(storeKey, JSON.stringify(next));
  };

  const submit = async () => {
    if (!shop || !combo.services.length || !date || !time || !barber || sending) return;
    setSending(true);
    if (sessionUid) {
      const brb = barbers.find(b => b.name === barber);
      const { error: e2 } = await supabase.from("appointments").insert({
        user_id: sessionUid, owner_id: shop.owner_id, barbershop_id: shop.id, service, barber,
        barber_id: brb?.id || null, price: combo.price, appointment_date: date, appointment_time: time,
        status: "confirmado", notes: `${name.trim()}||${phone.replace(/\D/g, "")}||${notes.trim()}`,
      });
      if (!e2) { setSending(false); saveMine(); setDone(true); return; }
      setSending(false);
      toast.error(e2.message?.includes("reservado") ? "Esse horário acabou de ser reservado. Escolha outro." : "Não foi possível agendar. Tente novamente.");
      return;
    }
    const { error } = await supabase.from("guest_bookings").insert({
      barbershop_id: shop.id, owner_id: shop.owner_id, name: name.trim(),
      phone: phone.replace(/\D/g, "") || null, service, service_ids: combo.serviceIds, barber,
      preferred_date: date, preferred_time: time, notes: notes.trim() || null,
    });
    setSending(false);
    if (error) { toast.error(error.message?.includes("reservado") ? "Esse horário acabou de ser reservado. Escolha outro." : "Não foi possível enviar. Tente novamente."); return; }
    saveMine(); setDone(true);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Scissors className="h-8 w-8 text-primary animate-spin" /></div>;
  if (!shop) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Barbearia não encontrada.</div>;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <motion.div aria-hidden className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl"
        animate={{ x: [0, 60, 0], y: [0, 40, 0] }} transition={{ duration: 12, repeat: Infinity }} />
      <motion.div aria-hidden className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
        animate={{ x: [0, -50, 0], y: [0, -30, 0] }} transition={{ duration: 14, repeat: Infinity }} />

      <div className="relative max-w-xl mx-auto px-4 py-10">
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          {shop.logo_url ? (
            <motion.img src={shop.logo_url} alt={shop.name} className="h-20 w-20 rounded-full object-cover mx-auto mb-3 ring-2 ring-primary/50"
              initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring" }} />
          ) : <Scissors className="h-12 w-12 text-primary mx-auto mb-3" />}
          <h1 className="font-display text-5xl gold-text tracking-wide">{shop.name}</h1>
          <p className="text-muted-foreground text-sm mt-1 flex items-center justify-center gap-1"><Sparkles className="h-3 w-3 text-primary" /> Agende em menos de 1 minuto — sem cadastro</p>
        </motion.header>

        {done ? (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-card/80 backdrop-blur border border-border rounded-2xl p-10 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
              className="h-20 w-20 rounded-full gold-gradient mx-auto flex items-center justify-center mb-4">
              <Check className="h-10 w-10 text-primary-foreground" />
            </motion.div>
            <h2 className="font-display text-3xl">Agendamento confirmado!</h2>
            <p className="text-muted-foreground text-sm mt-2">Seu horário já está reservado. Acompanhe abaixo.</p>
          </motion.div>
        ) : (
          <div className="bg-card/80 backdrop-blur border border-border rounded-2xl p-6 shadow-2xl">
            <div className="flex gap-2 mb-6">
              {steps.map((s, i) => (
                <div key={s} className="flex-1">
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <motion.div className="h-full gold-gradient" initial={false} animate={{ width: i <= step ? "100%" : "0%" }} />
                  </div>
                  <p className={cn("text-[10px] mt-1 uppercase tracking-wider", i === step ? "text-primary" : "text-muted-foreground")}>{s}</p>
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }} className="min-h-[280px]">
                {step === 0 && (
                  <div className="grid gap-2">
                    <Button variant="outline" type="button" aria-expanded={openSvc} onClick={() => setOpenSvc(o => !o)} className="h-auto min-h-14 whitespace-normal flex justify-between items-center p-4 rounded-xl border border-primary/40 bg-primary/5 font-medium text-left">
                      <span className="flex min-w-0 items-center gap-2"><Scissors className="h-4 w-4 shrink-0 text-primary" /><span className="break-words">{service || "Escolha os serviços"}</span></span>
                      <motion.span animate={{ rotate: openSvc ? 180 : 0 }}><ChevronDown className="h-5 w-5 text-primary" /></motion.span>
                    </Button>
                    <AnimatePresence initial={false}>{openSvc && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="grid gap-2 overflow-hidden">
                    <BookingServicePicker services={services} value={serviceIds} onChange={setServiceIds} />
                    </motion.div>)}</AnimatePresence>
                    {!openSvc && combo.services.length > 0 && <p className="text-right font-semibold text-primary">{combo.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>}
                  </div>
                )}
                {step === 1 && (
                  <div className="grid grid-cols-2 gap-3">
                    {barbers.map((b, i) => (
                      <motion.button key={b.id} type="button" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                        whileHover={{ y: -4 }} whileTap={{ scale: 0.96 }} onClick={() => setBarber(b.name)}
                        className={cn("p-4 rounded-xl border flex flex-col items-center gap-2", barber === b.name ? "border-primary bg-primary/10" : "border-border bg-secondary/50")}>
                        {b.photo_url ? <img src={b.photo_url} alt={b.name} className="h-14 w-14 rounded-full object-cover" /> :
                          <div className="h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center"><User className="h-6 w-6 text-primary" /></div>}
                        <span className="text-sm font-medium text-center">{b.name}</span>
                      </motion.button>
                    ))}
                  </div>
                )}
                {step === 2 && (
                  <div className="space-y-4">
                    <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                      {days.map(d => {
                        const v = d.toISOString().slice(0, 10);
                        return (
                          <motion.button key={v} type="button" whileTap={{ scale: 0.92 }} onClick={() => setDate(v)}
                            className={cn("shrink-0 w-16 py-3 rounded-xl border text-center", date === v ? "border-primary gold-gradient text-primary-foreground" : "border-border bg-secondary/50")}>
                            <p className="text-[10px] uppercase">{d.toLocaleDateString("pt-BR", { weekday: "short" })}</p>
                            <p className="font-display text-2xl">{d.getDate()}</p>
                          </motion.button>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {SLOTS.map(t => (
                        <motion.button key={t} type="button" whileTap={{ scale: 0.92 }} disabled={!date || busy.has(t)} onClick={() => setTime(t)}
                          className={cn("py-2 rounded-lg border text-sm flex items-center justify-center gap-1 disabled:opacity-40", busy.has(t) && "line-through border-destructive/40 text-destructive", time === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/50")}>
                          {busy.has(t) ? <span className="font-bold">✕</span> : <Clock className="h-3 w-3" />}{t}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
                {step === 3 && (
                  <div className="space-y-3">
                    <div className="relative"><Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Seu número (já é cliente? só digite)" value={phone} onChange={e => { setPhone(e.target.value); lookupPhone(e.target.value); }} className="pl-10 bg-secondary border-border" /></div>
                    {known && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-primary flex items-center gap-1"><Check className="h-4 w-4" />Olá, {known}! Já encontramos seu cadastro.</motion.p>}
                    {known && !sessionUid && <a href="/cliente/login" className="text-xs underline text-primary">Entrar na minha conta para agendar pelo meu login</a>}
                    <div className="relative"><User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} maxLength={120} className="pl-10 bg-secondary border-border" /></div>
                    <Textarea placeholder="Observações (opcional)" value={notes} onChange={e => setNotes(e.target.value)} maxLength={500} className="bg-secondary border-border" />
                    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm space-y-1">
                      <p className="flex items-center gap-2"><Scissors className="h-3 w-3 text-primary" />{service} · {barber}</p>
                      <p className="font-semibold text-primary">Total: {combo.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                      <p className="flex items-center gap-2"><Calendar className="h-3 w-3 text-primary" />{date && new Date(date + "T12:00").toLocaleDateString("pt-BR")} às {time}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex gap-2 mt-6">
              {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-1"><ArrowLeft className="h-4 w-4" />Voltar</Button>}
              {step < 3 ? (
                <Button className="flex-1 gap-1 gold-gradient text-primary-foreground" disabled={!canNext} onClick={() => setStep(step + 1)}>Continuar <ArrowRight className="h-4 w-4" /></Button>
              ) : (
                <Button className="flex-1 gold-gradient text-primary-foreground" disabled={!canNext || sending} onClick={submit}>{sending ? "Enviando..." : "Enviar pedido"}</Button>
              )}
            </div>
          </div>
        )}

        {mine.length > 0 && (
          <div className="mt-6 bg-card/80 backdrop-blur border border-border rounded-2xl p-5">
            <h3 className="font-display text-2xl mb-3">Meus agendamentos</h3>
            <div className="space-y-2">
              {mine.map((m, i) => {
                const st = mineStatus[`${m.date}|${m.time}|${m.barber_id}`] || (m.date < new Date().toISOString().slice(0, 10) ? "concluído" : "confirmado");
                return (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border bg-secondary/40 text-sm">
                    <div>
                      <p className="font-medium">{m.service} · {m.barber}</p>
                      <p className="text-xs text-muted-foreground">{new Date(m.date + "T12:00").toLocaleDateString("pt-BR")} às {m.time}</p>
                    </div>
                    <span className={cn("text-[10px] px-2 py-1 rounded-full border capitalize", st === "cancelado" ? "border-destructive/40 text-destructive" : "border-primary/40 text-primary")}>{st}</span>
                  </div>
                );
              })}
            </div>
            {done && <Button variant="outline" className="w-full mt-3" onClick={() => { setDone(false); setStep(0); setTime(""); }}>Fazer outro agendamento</Button>}
          </div>
        )}
      </div>
    </div>
  );
}
