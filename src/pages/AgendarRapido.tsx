import "@/styles/landing.css";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Scissors, User, CalendarDays, Clock, Check, ChevronRight, ChevronDown, ArrowLeft, Phone, Sparkles, ArrowUpRight, ShieldCheck, X } from "lucide-react";
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

const reveal = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.45 } };

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function AgendarRapido() {
  const { slug } = useParams();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<{ id: string; name: string; price: number; duration_min: number | null }[]>([]);
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
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

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
          supabase.from("services").select("id,name,price,duration_min").eq("owner_id", b.owner_id).eq("active", true).order("name"),
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

  const steps = ["Serviços", "Barbeiro", "Data e horário", "Confirmar"];
  const canNext = [combo.services.length > 0, !!barber, !!date && !!time, name.trim().length > 1][step];

  const storeKey = `agendar_${slug}`;
  const [mine, setMine] = useState<any[]>(() => { try { return JSON.parse(localStorage.getItem(`agendar_${slug}`) || "[]"); } catch { return []; } });
  const [mineStatus, setMineStatus] = useState<Record<string, string>>({});
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

  if (loading) return <div className="public-landing public-flow min-h-screen bg-background flex items-center justify-center"><Scissors className="h-8 w-8 text-primary animate-spin" /></div>;
  if (!shop) return <div className="public-landing public-flow min-h-screen bg-background flex items-center justify-center text-muted-foreground">Barbearia não encontrada.</div>;

  const summary = [
    combo.services.length > 0 && combo.name,
    barber,
    date && `${new Date(date + "T12:00").toLocaleDateString("pt-BR")}${time ? ` às ${time}` : ""}`,
  ].filter(Boolean) as string[];

  return (
    <div className="public-landing public-flow min-h-screen bg-background text-foreground relative overflow-hidden">
      <motion.div aria-hidden className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
        animate={{ x: [0, 60, 0], y: [0, 40, 0] }} transition={{ duration: 12, repeat: Infinity }} />
      <motion.div aria-hidden className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
        animate={{ x: [0, -50, 0], y: [0, -30, 0] }} transition={{ duration: 14, repeat: Infinity }} />

      <header className="landing-nav sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="landing-container flex min-h-20 items-center justify-between gap-4 py-3">
          <Link to={`/site/${slug}`} className="flex min-w-0 items-center gap-3">
            {shop.logo_url ? <img src={shop.logo_url} alt={shop.name} className="h-11 w-11 shrink-0 rounded-md object-cover" /> : <Scissors className="h-9 w-9 shrink-0 text-primary" />}
            <span className="font-display text-2xl leading-none break-words">{shop.name}</span>
          </Link>
          <Button asChild variant="outline" className="border-primary/50 text-primary">
            <Link to={sessionUid ? "/cliente" : "/cliente/login"}>{sessionUid ? "Meu portal" : "Entrar"} <ArrowUpRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </header>

      <main className="relative landing-container py-10 md:py-14">
        <motion.div {...reveal} className="mb-9 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="landing-eyebrow"><Sparkles className="mr-2 inline h-3 w-3" />Agende em menos de 1 minuto</p>
            <h1 className="font-display text-4xl md:text-6xl">Agende seu horário</h1>
          </div>
          <span className="text-xs text-muted-foreground">{shop.description || "Seu próximo corte começa aqui."}</span>
        </motion.div>

        <motion.div {...reveal} className="landing-steps mb-9 grid grid-cols-2 gap-4 md:grid-cols-4">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm transition-colors",
                i === step ? "border-primary bg-primary text-primary-foreground" : i < step ? "border-primary text-primary" : "border-border text-muted-foreground")}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className={cn("text-sm", i === step ? "text-foreground" : "text-muted-foreground")}>{label}</span>
              {i < 3 && <span className="hidden h-px flex-1 bg-border md:block" />}
            </div>
          ))}
        </motion.div>

        {done ? (
          <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="border border-primary/40 bg-card/80 backdrop-blur p-10 text-center" style={{ borderRadius: 8 }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.15 }}
              className="gold-gradient mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full">
              <Check className="h-10 w-10 text-primary-foreground" />
            </motion.div>
            <h2 className="font-display text-4xl">Agendamento confirmado!</h2>
            <p className="mt-2 text-sm text-muted-foreground">Seu horário já está reservado. Acompanhe abaixo.</p>
            <Button variant="outline" className="mt-6" onClick={() => { setDone(false); setStep(0); setTime(""); }}>Fazer outro agendamento</Button>
          </motion.div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div>
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }} className="min-h-[300px]">
                  {step === 0 && (
                    <div>
                      <div className="mb-5 flex items-center gap-2"><Scissors className="h-5 w-5 text-primary" /><h2 className="font-display text-2xl">Cortes & serviços</h2></div>
                      {services.length === 0 ? <p className="text-muted-foreground">Nenhum serviço disponível no momento.</p> : (
                        <>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {(servicesExpanded ? services : services.slice(0, 4)).map((s, i) => {
                              const selected = serviceIds.includes(s.id);
                              return (
                                <motion.button key={s.id} type="button" {...reveal} transition={{ duration: 0.35, delay: (i % 4) * 0.04 }}
                                  aria-pressed={selected} onClick={() => setServiceIds(sel => sel.includes(s.id) ? sel.filter(x => x !== s.id) : [...sel, s.id])}
                                  className={cn("landing-service flex h-full min-h-24 w-full items-center justify-between gap-4 border p-5 text-left transition-colors",
                                    selected ? "border-primary bg-primary/10" : "border-border")}>
                                  <span className="min-w-0">
                                    <span className="block break-words text-base font-medium">{s.name}</span>
                                    <span className="mt-2 flex items-center gap-2 text-xs font-normal text-muted-foreground">
                                      {s.duration_min ? <><Clock className="h-3 w-3" />{s.duration_min} min</> : null}
                                      {selected && <span className="flex items-center gap-1 text-primary"><Check className="h-3 w-3" />Selecionado</span>}
                                    </span>
                                  </span>
                                  <span className="flex shrink-0 flex-col items-end gap-3">
                                    <strong className="text-primary">{fmt(Number(s.price))}</strong>
                                    {selected ? <Check className="h-4 w-4 text-primary" /> : <ArrowUpRight className="h-4 w-4 text-muted-foreground" />}
                                  </span>
                                </motion.button>
                              );
                            })}
                          </div>
                          {combo.services.length > 0 && (
                            <p className="mt-4 text-sm text-muted-foreground">
                              Total: <strong className="text-primary">{fmt(combo.price)}</strong> · {combo.services.length === 1 ? "1 serviço" : `${combo.services.length} serviços`}
                            </p>
                          )}
                          {services.length > 4 && (
                            <Button variant="ghost" className="mt-3 text-primary" onClick={() => setServicesExpanded(!servicesExpanded)} aria-expanded={servicesExpanded}>
                              {servicesExpanded ? "Ver menos serviços" : `Todos os serviços (${services.length})`}
                              <ChevronRight className={cn("ml-2 h-4 w-4 transition-transform", servicesExpanded ? "-rotate-90" : "rotate-90")} />
                            </Button>
                          )}
                          <Button variant="ghost" className="mt-1 text-xs text-muted-foreground" onClick={() => setPickerOpen(o => !o)} aria-expanded={pickerOpen}>
                            Combinar serviços <ChevronDown className={cn("ml-1 h-3 w-3 transition-transform", pickerOpen && "rotate-180")} />
                          </Button>
                          <AnimatePresence initial={false}>
                            {pickerOpen && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <BookingServicePicker services={services} value={serviceIds} onChange={setServiceIds} />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      )}
                    </div>
                  )}
                  {step === 1 && (
                    <div>
                      <div className="mb-5 flex items-center gap-2"><User className="h-5 w-5 text-primary" /><h2 className="font-display text-2xl">Escolha seu barbeiro</h2></div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {barbers.map((b, i) => (
                          <motion.button key={b.id} type="button" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}
                            whileHover={{ y: -4 }} whileTap={{ scale: 0.96 }} onClick={() => setBarber(b.name)}
                            className={cn("flex flex-col items-center gap-2 rounded-lg border p-5 transition-colors", barber === b.name ? "border-primary bg-primary/10" : "border-border bg-secondary/40 hover:border-primary/50")}>
                            {b.photo_url ? <img src={b.photo_url} alt={b.name} className="h-16 w-16 rounded-full object-cover" /> :
                              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15"><User className="h-7 w-7 text-primary" /></div>}
                            <span className="text-sm font-medium text-center">{b.name}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                  {step === 2 && (
                    <div>
                      <div className="mb-5 flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /><h2 className="font-display text-2xl">Data e horário</h2></div>
                      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                        {days.map(d => {
                          const v = d.toISOString().slice(0, 10);
                          return (
                            <motion.button key={v} type="button" whileTap={{ scale: 0.92 }} onClick={() => setDate(v)}
                              className={cn("w-16 shrink-0 rounded-lg border py-3 text-center transition-colors", date === v ? "border-primary gold-gradient text-primary-foreground" : "border-border bg-secondary/40")}>
                              <p className="text-[10px] uppercase">{d.toLocaleDateString("pt-BR", { weekday: "short" })}</p>
                              <p className="font-display text-2xl">{d.getDate()}</p>
                            </motion.button>
                          );
                        })}
                      </div>
                      <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
                        {SLOTS.map(t => (
                          <motion.button key={t} type="button" whileTap={{ scale: 0.92 }} disabled={!date || busy.has(t)} onClick={() => setTime(t)}
                            className={cn("flex items-center justify-center gap-1 rounded-md border py-2 text-sm transition-colors disabled:opacity-40",
                              busy.has(t) && "border-destructive/40 text-destructive line-through",
                              time === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/40")}>
                            {busy.has(t) ? <X className="h-3 w-3" /> : <Clock className="h-3 w-3" />}{t}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                  {step === 3 && (
                    <div className="space-y-3">
                      <div className="mb-5 flex items-center gap-2"><Check className="h-5 w-5 text-primary" /><h2 className="font-display text-2xl">Confirme seus dados</h2></div>
                      <div className="relative"><Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Seu número (já é cliente? só digite)" value={phone} onChange={e => { setPhone(e.target.value); lookupPhone(e.target.value); }} className="pl-10 bg-secondary border-border" /></div>
                      {known && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1 text-sm text-primary"><Check className="h-4 w-4" />Olá, {known}! Já encontramos seu cadastro.</motion.p>}
                      {known && !sessionUid && <a href="/cliente/login" className="text-xs underline text-primary">Entrar na minha conta para agendar pelo meu login</a>}
                      <div className="relative"><User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} maxLength={120} className="pl-10 bg-secondary border-border" /></div>
                      <Textarea placeholder="Observações (opcional)" value={notes} onChange={e => setNotes(e.target.value)} maxLength={500} className="bg-secondary border-border" />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
              {step > 0 && (
                <Button variant="ghost" className="mt-6 text-muted-foreground" onClick={() => setStep(step - 1)}><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Button>
              )}
            </div>

            <aside className="landing-booking-aside border-l border-border pl-0 lg:pl-7 lg:border-t-0">
              <CalendarDays className="mb-5 h-8 w-8 text-primary" />
              <h2 className="font-display text-3xl leading-tight">O próximo horário<br />é seu.</h2>
              <div className="my-6 space-y-4 text-sm text-muted-foreground">
                {barbers.length > 0 && (
                  <div className="flex -space-x-2">
                    {barbers.slice(0, 4).map(b => b.photo_url
                      ? <img key={b.id} src={b.photo_url} alt={b.name} className="h-10 w-10 rounded-full border-2 border-background object-cover" loading="lazy" />
                      : <span key={b.id} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-secondary text-primary">{b.name.slice(0, 1)}</span>)}
                  </div>
                )}
                {summary.length > 0
                  ? <ul className="space-y-1">{summary.map((line, i) => <li key={i} className="text-foreground/90">{line}</li>)}</ul>
                  : <p>Escolha seu barbeiro e encontre o melhor horário para você.</p>}
                {combo.services.length > 0 && <p>Total: <strong className="text-primary">{fmt(combo.price)}</strong></p>}
              </div>
              {step < 3 ? (
                <Button className="w-full gold-gradient text-primary-foreground" disabled={!canNext} onClick={() => setStep(step + 1)}>
                  {step === 2 ? "Agendar agora" : "Continuar"} <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button className="confirm-white w-full font-semibold" disabled={!canNext || sending} onClick={submit}>
                  {sending ? "Confirmando..." : "Confirmar agendamento"}
                </Button>
              )}
              <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" />Seus dados protegidos.</p>
            </aside>
          </div>
        )}

        {mine.length > 0 && (
          <section className="landing-section border-t border-border pb-4">
            <h2 className="font-display text-3xl mb-5">Meus agendamentos</h2>
            <div className="space-y-2">
              {mine.map((m, i) => {
                const st = mineStatus[`${m.date}|${m.time}|${m.barber_id}`] || (m.date < new Date().toISOString().slice(0, 10) ? "concluído" : "confirmado");
                return (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-4 text-sm">
                    <div>
                      <p className="font-medium">{m.service} · {m.barber}</p>
                      <p className="text-xs text-muted-foreground">{new Date(m.date + "T12:00").toLocaleDateString("pt-BR")} às {m.time}</p>
                    </div>
                    <span className={cn("rounded-full border px-2 py-1 text-[10px] capitalize", st === "cancelado" ? "border-destructive/40 text-destructive" : "border-primary/40 text-primary")}>{st}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
