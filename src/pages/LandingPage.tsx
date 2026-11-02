import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Scissors, MapPin, Phone, Instagram, Facebook, MessageCircle, Star, ChevronRight, Crown, Check, Loader2, Sparkles, Share2, CalendarDays, Clock, ArrowUpRight, Menu, X, ShieldCheck, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { applyShopBranding, shareShop } from "@/lib/siteBranding";
import { ThemeToggle } from "@/components/ThemeToggle";
import heroImage from "@/assets/barbershop-grooming.jpg";
import "@/styles/landing.css";
import { ClienteChat } from "@/components/cliente/ClienteChat";

interface Shop {
  id: string; owner_id: string; slug: string; name: string;
  description: string | null; phone: string | null; address: string | null;
  logo_url: string | null; instagram: string | null; facebook: string | null;
  whatsapp: string | null; map_embed_url: string | null; photos: string[];
}
interface Plan { id: string; name: string; price: number; period: string; features: string[]; popular: boolean; }
interface Service { id: string; name: string; price: number; duration_min: number; }
interface Barber { id: string; name: string; photo_url?: string | null; }

const SHOP_KEY = "barberpro:client-barbershop";

const normalize = (raw: string | null, kind: "instagram" | "facebook" | "whatsapp") => {
  if (!raw) return null;
  const v = raw.trim(); if (!v) return null;
  if (v.startsWith("http")) return v;
  if (kind === "instagram") return `https://instagram.com/${v.replace(/^@/, "")}`;
  if (kind === "facebook") return `https://facebook.com/${v}`;
  if (kind === "whatsapp") return `https://wa.me/${v.replace(/\D/g, "")}`;
  return v;
};

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { slug: routeSlug } = useParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [params] = useSearchParams();
  const [shop, setShop] = useState<Shop | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);
  const [qName, setQName] = useState("");
  const [qEmail, setQEmail] = useState("");
  const [qPassword, setQPassword] = useState("");
  const [servicesExpanded, setServicesExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = (() => {
        try { return JSON.parse(localStorage.getItem(SHOP_KEY) || "{}"); } catch { return {}; }
      })();
      const slugFromUrl = routeSlug || params.get("shop") || params.get("slug") || stored.slug;
      let query = supabase.from("barbershops").select("*").eq("active", true);
      if (slugFromUrl) query = query.eq("slug", slugFromUrl);
      else if (user) query = query.eq("owner_id", user.id);
      else query = query.order("created_at", { ascending: false }).limit(1);

      let { data: b } = await query.maybeSingle();
      if (!b && slugFromUrl && !routeSlug) {
        const fallback = await supabase
          .from("barbershops")
          .select("*")
          .eq("active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        b = fallback.data;
      }
      if (!b) { setLoading(false); return; }
      const s: Shop = { ...b, photos: Array.isArray(b.photos) ? b.photos : [] } as Shop;
      setShop(s);
      applyShopBranding(s);
      localStorage.setItem(SHOP_KEY, JSON.stringify({ id: s.id, slug: s.slug }));

      const [{ data: p }, { data: sv }, { data: br }] = await Promise.all([
        supabase.from("plans").select("*").or(`barbershop_id.eq.${s.id},owner_id.eq.${s.owner_id}`).eq("active", true).order("price"),
        supabase.from("services").select("id,name,price,duration_min").or(`barbershop_id.eq.${s.id},owner_id.eq.${s.owner_id}`).eq("active", true).order("price"),
        supabase.from("barbers").select("id,name,photo_url").or(`barbershop_id.eq.${s.id},owner_id.eq.${s.owner_id}`).eq("active", true).order("name"),
      ]);
      setPlans((p || []).map((x: any) => ({ ...x, features: x.features || [] })));
      setServices((sv || []) as Service[]);
      setBarbers((br || []) as Barber[]);
      setLoading(false);
    })();
  }, [params, user, routeSlug]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const startMpSubscription = async (planId: string) => {
    if (!shop) return;
    setSubscribing(planId);
    try {
      const { data, error } = await supabase.functions.invoke("mp-create-subscription", {
        body: { plan_id: planId, admin_user_id: shop.owner_id },
      });
      if (error || !data?.init_point) throw new Error(data?.error || error?.message || "Erro");
      window.location.href = data.init_point;
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar assinatura");
      setSubscribing(null);
    }
  };

  const subscribe = async (planId: string) => {
    if (!shop) return;
    if (!user) {
      // Cadastro rápido inline para ir direto pro Mercado Pago
      setPendingPlanId(planId);
      setQuickOpen(true);
      return;
    }
    startMpSubscription(planId);
  };

  const handleQuickSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPlanId) return;
    setSubscribing(pendingPlanId);
    try {
      // Tenta criar conta; se já existir, faz login.
      const signUp = await supabase.auth.signUp({
        email: qEmail,
        password: qPassword,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: qName },
        },
      });
      if (signUp.error && !/already/i.test(signUp.error.message)) {
        throw signUp.error;
      }
      if (!signUp.data.session) {
        const signIn = await supabase.auth.signInWithPassword({ email: qEmail, password: qPassword });
        if (signIn.error) throw signIn.error;
      }
      setQuickOpen(false);
      await startMpSubscription(pendingPlanId);
    } catch (err: any) {
      toast.error(err.message || "Não foi possível iniciar");
      setSubscribing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-4">
        <Scissors className="h-12 w-12 text-muted-foreground mb-4" />
        <h1 className="font-display text-3xl gold-text mb-2">Nenhuma barbearia ativa</h1>
        <p className="text-muted-foreground mb-6">Configure sua barbearia no painel admin.</p>
        <Link to="/admin/login"><Button>Acessar Admin</Button></Link>
      </div>
    );
  }

  const instagramUrl = normalize(shop.instagram, "instagram");
  const facebookUrl = normalize(shop.facebook, "facebook");
  const whatsappUrl = normalize(shop.whatsapp, "whatsapp");
  const mapSrc = shop.map_embed_url
    || (shop.address ? `https://www.google.com/maps?q=${encodeURIComponent(shop.address)}&output=embed` : null);

  const bookingUrl = user ? `/cliente?tab=agendar&shop=${shop.slug}` : `/agendar/${shop.slug}`;
  const reveal = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.45 } };
  const navItems = [["services", "Serviços"], ["plans", "Planos"], ["team", "Barbeiros"], ["gallery", "Galeria"], ["contact", "Contato"]];
  return (
    <div className="public-landing min-h-screen bg-background text-foreground">
      <header className="landing-nav sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="landing-container flex min-h-20 items-center justify-between gap-4 py-3">
          <Link to={routeSlug ? `/site/${routeSlug}` : "/"} className="flex min-w-0 items-center gap-3">
            {shop.logo_url ? <img src={shop.logo_url} alt={shop.name} className="h-11 w-11 shrink-0 rounded-md object-cover" /> : <Scissors className="h-9 w-9 shrink-0 text-primary" />}
            <span className="font-display text-2xl leading-none break-words">{shop.name}</span>
          </Link>
          <nav aria-label="Navegação principal" className="hidden xl:flex items-center gap-6 text-xs font-medium uppercase">
            {navItems.map(([id,label]) => <a key={id} href={`#${id}`} className="text-muted-foreground transition-colors hover:text-primary">{label}</a>)}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden sm:block"><ThemeToggle /></div>
            <Button variant="ghost" size="icon" aria-label="Compartilhar barbearia" className="hidden sm:inline-flex" onClick={async () => { const result = await shareShop(shop); if (result === "copied") toast.success("Link copiado!"); }}><Share2 className="h-4 w-4" /></Button>
            <Button asChild variant="outline" className="hidden md:inline-flex border-primary/50 text-primary"><Link to={user ? "/cliente" : "/cliente/login"}>{user ? "Meu portal" : "Entrar"}</Link></Button>
            <Button asChild className="hidden sm:inline-flex"><Link to={bookingUrl}>Agendar <CalendarDays className="ml-2 h-4 w-4" /></Link></Button>
            <Button variant="ghost" size="icon" className="xl:hidden" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</Button>
          </div>
        </div>
        {menuOpen && <nav aria-label="Menu móvel" className="landing-container grid grid-cols-2 gap-4 border-t border-border py-5 text-sm">{navItems.map(([id,label]) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{label}</a>)}<Link to={user ? "/cliente" : "/cliente/login"}>{user ? "Meu portal" : "Entrar"}</Link><Link to={bookingUrl}>Agendar</Link><ThemeToggle /></nav>}
      </header>

      <section className="landing-hero relative isolate overflow-hidden">
        <img src={shop.photos[0] || heroImage} alt={shop.photos[0] ? shop.name : "Atendimento de barba em uma barbearia"} width={1536} height={1024} className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
        <div className="landing-hero-shade absolute inset-0" />
        <motion.div {...reveal} className="landing-container relative z-10 py-20 md:py-24">
          <p className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase text-primary"><span className="h-px w-8 bg-primary" />Estilo · Cuidado · Identidade</p>
          <h1 className="max-w-xl font-display text-6xl leading-none md:text-8xl break-words">{shop.name}</h1>
          <p className="landing-hero-copy mt-6 max-w-md text-base leading-relaxed">{shop.description || "Seu próximo corte começa aqui."}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to={bookingUrl}>Agendar meu horário <CalendarDays className="ml-3 h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline" className="landing-hero-secondary"><a href="#services">Nossos serviços <ArrowUpRight className="ml-2 h-4 w-4" /></a></Button>
          </div>
          <div className="landing-hero-copy mt-10 flex items-center gap-2 text-xs"><Scissors className="h-4 w-4 text-primary" /><span>Cabelo, barba e cuidado em cada detalhe.</span></div>
        </motion.div>
      </section>

      <section id="services" className="landing-section scroll-mt-24 border-b border-border">
        <div className="landing-container">
          <motion.div {...reveal} className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <div><p className="landing-eyebrow">Seu momento de cuidado</p><h2 className="font-display text-4xl md:text-5xl">Agende seu horário</h2></div>
            <Button asChild variant="outline"><Link to={bookingUrl}>Ir para agendamento <ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button>
          </motion.div>
          <div className="landing-steps mb-9 grid grid-cols-2 gap-4 md:grid-cols-4">
            {["Serviços", "Barbeiro", "Data e horário", "Confirmar"].map((label,i) => <div key={label} className="flex items-center gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm ${i === 0 ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{i+1}</span><span className="text-sm">{label}</span>{i < 3 && <span className="hidden h-px flex-1 bg-border md:block" />}</div>)}
          </div>
          <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
            <div><div className="mb-5 flex items-center gap-2"><Scissors className="h-5 w-5 text-primary" /><h3 className="font-display text-2xl">Cortes & serviços</h3></div>
              {services.length === 0 ? <p className="text-muted-foreground">Nenhum serviço disponível no momento.</p> : <div className="grid gap-3 sm:grid-cols-2">{(servicesExpanded ? services : services.slice(0,4)).map((service,i) => <motion.div key={service.id} {...reveal} transition={{ duration: .35, delay: (i % 4) * .04 }}><Button variant="outline" className="landing-service h-full min-h-24 w-full justify-between gap-4 whitespace-normal p-5 text-left" onClick={() => { if (user) navigate(`/cliente?tab=agendar&service=${service.id}&shop=${shop.slug}`); else navigate(`/cliente/login?redirect=${encodeURIComponent(`/cliente?tab=agendar&service=${service.id}&shop=${shop.slug}`)}`); }}><span className="min-w-0"><span className="block text-base font-medium break-words">{service.name}</span><span className="mt-2 flex items-center gap-2 text-xs font-normal text-muted-foreground"><Clock className="h-3 w-3" />{service.duration_min} min</span></span><span className="flex shrink-0 flex-col items-end gap-3"><strong className="text-primary">{fmt(Number(service.price))}</strong><ArrowUpRight className="h-4 w-4 text-muted-foreground" /></span></Button></motion.div>)}</div>}
              {services.length > 4 && <Button variant="ghost" className="mt-4 text-primary" onClick={() => setServicesExpanded(!servicesExpanded)} aria-expanded={servicesExpanded}>{servicesExpanded ? "Ver menos serviços" : `Todos os serviços (${services.length})`}<ChevronRight className={`ml-2 h-4 w-4 transition-transform ${servicesExpanded ? "-rotate-90" : "rotate-90"}`} /></Button>}
            </div>
            <aside className="landing-booking-aside border-l border-border pl-7">
              <CalendarDays className="mb-5 h-8 w-8 text-primary" /><h3 className="font-display text-3xl">O próximo horário<br />é seu.</h3>
              <div className="my-6 space-y-4 text-sm text-muted-foreground">{barbers.length > 0 && <div className="flex -space-x-2">{barbers.slice(0,4).map(b => b.photo_url ? <img key={b.id} src={b.photo_url} alt={b.name} className="h-10 w-10 rounded-full border-2 border-background object-cover" loading="lazy" /> : <span key={b.id} className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-secondary text-primary">{b.name.slice(0,1)}</span>)}</div>}<p>Escolha seu barbeiro e encontre o melhor horário para você.</p></div>
              <Button asChild className="w-full"><Link to={bookingUrl}>Agendar agora <ChevronRight className="ml-2 h-4 w-4" /></Link></Button>
              <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" />Seus dados protegidos.</p>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-secondary/30 py-7"><div className="landing-container grid grid-cols-2 gap-7 md:grid-cols-4">{[[CalendarDays,"Agendamento", "Seu horário reservado"],[Scissors,"Serviços", "Cabelo, barba e cuidado"],[Crown,"Assinaturas", "Seu cuidado em dia"],[CreditCard,"Mercado Pago", "Pagamento dos planos"]].map(([Icon,title,description]) => { const FeatureIcon = Icon as typeof Scissors; return <div key={String(title)} className="flex items-start gap-3"><FeatureIcon className="h-7 w-7 shrink-0 text-primary" /><div><p className="text-sm font-medium">{String(title)}</p><p className="mt-1 text-xs text-muted-foreground">{String(description)}</p></div></div>; })}</div></section>

      <section id="plans" className="landing-section scroll-mt-24"><div className="landing-container">
        <motion.div {...reveal} className="mb-10 text-center"><p className="landing-eyebrow">Um compromisso com seu estilo</p><h2 className="font-display text-4xl md:text-5xl">Planos de assinatura</h2></motion.div>
        {plans.length === 0 ? <p className="text-center text-muted-foreground">Nenhum plano disponível no momento.</p> : <div className="grid gap-5 md:grid-cols-3">{plans.map(p => <motion.div {...reveal} key={p.id} className={`landing-plan relative flex flex-col rounded-lg border p-7 ${p.popular ? "border-primary" : "border-border"}`}>
          <div className="mb-5 flex items-center justify-between gap-2"><Crown className="h-6 w-6 text-primary" />{p.popular && <Badge className="bg-primary/15 text-primary">Mais popular</Badge>}</div><h3 className="font-display text-3xl">{p.name}</h3><div className="my-5"><span className="font-display text-4xl text-primary">{fmt(Number(p.price))}</span><span className="ml-2 text-xs text-muted-foreground">/ {p.period}</span></div><ul className="mb-8 flex-1 space-y-3 border-t border-border pt-5">{p.features.map((f,i) => <li key={i} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{f}</li>)}</ul><Button variant={p.popular ? "default" : "outline"} onClick={() => subscribe(p.id)} disabled={subscribing === p.id}>{subscribing === p.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Assinar com Mercado Pago</Button>
        </motion.div>)}</div>}
      </div></section>

      {barbers.length > 0 && <section id="team" className="landing-section scroll-mt-24 border-y border-border bg-secondary/20"><div className="landing-container"><motion.div {...reveal} className="mb-9"><p className="landing-eyebrow">Quem cuida do seu estilo</p><h2 className="font-display text-4xl md:text-5xl">Nossos barbeiros</h2></motion.div><div className="grid grid-cols-2 gap-5 md:grid-cols-4">{barbers.map(b => <motion.div {...reveal} key={b.id} className="group"><div className="mb-4 flex aspect-[4/5] items-center justify-center overflow-hidden rounded-md bg-secondary">{b.photo_url ? <img src={b.photo_url} alt={b.name} className="h-full w-full object-cover" loading="lazy" /> : <Scissors className="h-14 w-14 text-primary/50" />}</div><div className="flex items-center justify-between gap-2"><h3 className="font-display text-2xl break-words">{b.name}</h3><Button asChild size="icon" variant="ghost" aria-label={`Agendar com ${b.name}`}><Link to={bookingUrl}><ArrowUpRight className="h-4 w-4 text-primary" /></Link></Button></div></motion.div>)}</div></div></section>}

      {shop.photos.length > 0 && <section id="gallery" className="landing-section scroll-mt-24"><div className="landing-container"><div className="mb-8"><p className="landing-eyebrow">Nossa barbearia</p><h2 className="font-display text-4xl md:text-5xl">Cada detalhe conta</h2></div><div className="grid grid-cols-2 gap-4 md:grid-cols-3">{shop.photos.map((url,i) => <motion.div {...reveal} key={url} className="group aspect-[4/3] overflow-hidden rounded-md"><img src={url} alt={`${shop.name} — foto ${i+1}`} className="h-full w-full object-cover" loading="lazy" /></motion.div>)}</div></div></section>}

      <section id="contact" className="landing-section scroll-mt-24 border-t border-border"><div className="landing-container grid gap-10 md:grid-cols-2"><div><p className="landing-eyebrow">Esperamos por você</p><h2 className="font-display text-4xl md:text-5xl">Seu estilo tem endereço.</h2><div className="my-7 space-y-5">{shop.address && <p className="flex items-start gap-3 text-sm"><MapPin className="h-5 w-5 shrink-0 text-primary" />{shop.address}</p>}{shop.phone && <a href={`tel:${shop.phone.replace(/[^+\d]/g, "")}`} className="flex items-center gap-3 text-sm"><Phone className="h-5 w-5 text-primary" />{shop.phone}</a>}</div><div className="flex gap-3">{[[instagramUrl,Instagram,"Instagram"],[facebookUrl,Facebook,"Facebook"],[whatsappUrl,MessageCircle,"WhatsApp"]].map(([url,Icon,label]) => { const SocialIcon = Icon as typeof Instagram; return url ? <Button asChild key={String(label)} variant="outline" size="icon"><a href={String(url)} target="_blank" rel="noreferrer" aria-label={String(label)}><SocialIcon className="h-4 w-4" /></a></Button> : null; })}</div></div>{mapSrc ? <iframe src={mapSrc} title={`Mapa - ${shop.name}`} className="h-80 w-full rounded-lg border border-border" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /> : <div className="flex flex-col items-start justify-center border-l border-border pl-8"><h3 className="mb-5 font-display text-3xl">Vamos marcar?</h3><Button asChild size="lg"><Link to={bookingUrl}>Reservar meu horário <CalendarDays className="ml-3 h-4 w-4" /></Link></Button></div>}</div></section>

      <footer className="border-t border-border bg-secondary/20 py-10"><div className="landing-container"><div className="mb-8 flex flex-wrap items-center justify-between gap-6"><div className="flex items-center gap-3"><Scissors className="h-7 w-7 text-primary" /><span className="font-display text-2xl">{shop.name}</span></div><nav aria-label="Navegação do rodapé" className="flex flex-wrap gap-5 text-xs text-muted-foreground">{navItems.map(([id,label]) => <a href={`#${id}`} key={id}>{label}</a>)}<Link to="/admin/login">Área administrativa</Link></nav></div><div className="flex flex-wrap justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground"><span>© {new Date().getFullYear()} {shop.name}. Todos os direitos reservados.</span><span className="flex items-center gap-2"><Scissors className="h-3 w-3 text-primary" />Feito para o seu estilo.</span></div></div></footer>

      <Dialog open={quickOpen} onOpenChange={(o) => { setQuickOpen(o); if (!o) setSubscribing(null); }}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl gold-text">Assinar agora</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Preencha rapidinho e você será levado direto ao Mercado Pago para concluir a assinatura mensal recorrente.
          </p>
          <form onSubmit={handleQuickSubscribe} className="space-y-3 mt-2">
            <Input placeholder="Seu nome" value={qName} onChange={(e) => setQName(e.target.value)} required className="bg-secondary border-border" />
            <Input type="email" placeholder="E-mail" value={qEmail} onChange={(e) => setQEmail(e.target.value)} required className="bg-secondary border-border" />
            <Input type="password" placeholder="Crie uma senha (mín. 6)" value={qPassword} onChange={(e) => setQPassword(e.target.value)} required minLength={6} className="bg-secondary border-border" />
            <Button type="submit" disabled={!!subscribing} className="w-full gold-gradient text-primary-foreground font-semibold">
              {subscribing ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Indo para o Mercado Pago...</>) : "Ir para o Mercado Pago"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Já tem conta? <Link to="/cliente/login" className="text-primary hover:underline">Entrar</Link>
            </p>
          </form>
        </DialogContent>
      </Dialog>
      <ClienteChat />
    </div>
  );
}
