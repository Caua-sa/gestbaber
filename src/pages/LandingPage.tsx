import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Scissors, MapPin, Phone, Instagram, Facebook, MessageCircle, Star, ChevronRight, Crown, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { applyShopBranding } from "@/lib/siteBranding";

interface Shop {
  id: string; owner_id: string; slug: string; name: string;
  description: string | null; phone: string | null; address: string | null;
  logo_url: string | null; instagram: string | null; facebook: string | null;
  whatsapp: string | null; map_embed_url: string | null; photos: string[];
}
interface Plan { id: string; name: string; price: number; period: string; features: string[]; popular: boolean; }
interface Service { id: string; name: string; price: number; duration_min: number; }
interface Barber { id: string; name: string; }

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

  useEffect(() => {
    (async () => {
      const stored = (() => {
        try { return JSON.parse(localStorage.getItem(SHOP_KEY) || "{}"); } catch { return {}; }
      })();
      const slugFromUrl = params.get("shop") || params.get("slug") || stored.slug;
      let query = supabase.from("barbershops").select("*").eq("active", true);
      if (slugFromUrl) query = query.eq("slug", slugFromUrl);
      else if (user) query = query.eq("owner_id", user.id);
      else query = query.order("created_at", { ascending: false }).limit(1);

      let { data: b } = await query.maybeSingle();
      if (!b && slugFromUrl) {
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
        supabase.from("barbers").select("id,name").or(`barbershop_id.eq.${s.id},owner_id.eq.${s.owner_id}`).eq("active", true).order("name"),
      ]);
      setPlans((p || []).map((x: any) => ({ ...x, features: x.features || [] })));
      setServices((sv || []) as Service[]);
      setBarbers((br || []) as Barber[]);
      setLoading(false);
    })();
  }, [params, user]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const subscribe = async (planId: string) => {
    if (!shop) return;
    if (!user) {
      toast.info("Faça login para assinar");
      navigate(`/cliente/login?redirect=${encodeURIComponent(`/?plan=${planId}`)}`);
      return;
    }
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {shop.logo_url ? (
              <img src={shop.logo_url} alt={shop.name} className="h-9 w-9 rounded-md object-cover border border-border" />
            ) : (
              <Scissors className="h-6 w-6 text-primary" />
            )}
            <span className="font-display text-xl gold-text tracking-wider">{shop.name}</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#services" className="hover:text-primary transition-colors">Serviços</a>
            <a href="#plans" className="hover:text-primary transition-colors">Planos</a>
            <a href="#team" className="hover:text-primary transition-colors">Equipe</a>
            <a href="#contact" className="hover:text-primary transition-colors">Contato</a>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <Link to="/cliente"><Button size="sm" variant="outline">Meu Portal</Button></Link>
            ) : (
              <Link to="/cliente/login"><Button size="sm" className="gold-gradient text-primary-foreground font-semibold">Entrar</Button></Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(38_92%_50%/0.1),transparent_60%)]" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto text-center relative z-10">
          {shop.logo_url && (
            <img src={shop.logo_url} alt={shop.name} className="h-24 w-24 mx-auto mb-6 rounded-2xl object-cover border-2 border-primary/30 shadow-xl" />
          )}
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">
            <Sparkles className="h-3 w-3 mr-1" /> Barbearia Premium
          </Badge>
          <h1 className="text-6xl md:text-8xl font-display gold-text leading-none mb-6">{shop.name}</h1>
          {shop.description && <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10">{shop.description}</p>}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/cliente/login">
              <Button size="lg" className="gold-gradient text-primary-foreground font-bold text-lg px-8 py-6 shadow-lg shadow-primary/20">
                Agendar Agora <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="#plans">
              <Button size="lg" variant="outline" className="border-border text-foreground px-8 py-6 text-lg">Ver Planos</Button>
            </a>
          </div>
          <div className="flex items-center justify-center gap-1 mt-8 text-primary">
            {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-primary" />)}
            <span className="ml-2 text-muted-foreground text-sm">Atendimento de excelência</span>
          </div>
        </motion.div>
      </section>

      {/* Galeria */}
      {shop.photos.length > 0 && (
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-3xl gold-text tracking-wide text-center mb-8">Galeria</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {shop.photos.map((url, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden border border-border">
                  <img src={url} alt={`${shop.name} ${i+1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Services */}
      <section id="services" className="py-20 px-4 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-display gold-text text-center mb-4">Cortes & Serviços</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">Valores atualizados pela barbearia.</p>
          {services.length === 0 ? (
            <p className="text-center text-muted-foreground">Nenhum serviço cadastrado.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map((s) => (
                <div key={s.id} className="bg-card border border-border rounded-xl p-6 hover:border-primary/40 hover:card-glow transition-all duration-300 group">
                  <div className="h-12 w-12 rounded-lg gold-gradient flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Scissors className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-display text-xl tracking-wide mb-1">{s.name}</h3>
                  <p className="text-primary font-bold text-lg mb-2">{fmt(Number(s.price))}</p>
                  <p className="text-muted-foreground text-sm">{s.duration_min} min</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Crown className="h-10 w-10 text-primary mx-auto mb-3" />
            <h2 className="text-4xl md:text-5xl font-display gold-text mb-4">Planos de Assinatura</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">Cobrança recorrente segura via Mercado Pago. Cancele quando quiser.</p>
          </div>
          {plans.length === 0 ? (
            <p className="text-center text-muted-foreground">Nenhum plano disponível no momento.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((p) => (
                <div key={p.id} className={`relative bg-card border rounded-2xl p-7 flex flex-col ${p.popular ? "border-primary ring-2 ring-primary/30 scale-[1.02]" : "border-border"}`}>
                  {p.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gold-gradient text-primary-foreground">Mais popular</Badge>
                  )}
                  <h3 className="font-display text-2xl tracking-wide mb-1">{p.name}</h3>
                  <div className="flex items-baseline gap-1 mb-5">
                    <span className="text-4xl font-display gold-text">{fmt(Number(p.price))}</span>
                    <span className="text-muted-foreground text-sm">/ {p.period}</span>
                  </div>
                  <ul className="space-y-2 mb-6 flex-1">
                    {(p.features || []).map((f, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => subscribe(p.id)}
                    disabled={subscribing === p.id}
                    className={p.popular ? "gold-gradient text-primary-foreground font-semibold" : ""}
                  >
                    {subscribing === p.id ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redirecionando...</>) : "Assinar com Mercado Pago"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Barbers */}
      {barbers.length > 0 && (
        <section id="team" className="py-20 px-4 bg-card/50">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-display gold-text text-center mb-12">Nossa Equipe</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {barbers.map((b) => (
                <div key={b.id} className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/40 transition-colors">
                  <div className="h-16 w-16 rounded-full gold-gradient mx-auto mb-3 flex items-center justify-center">
                    <Scissors className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <p className="font-display text-lg tracking-wide">{b.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      <section id="contact" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-display gold-text text-center mb-12">Contato</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shop.phone && (
              <div className="bg-card border border-border rounded-xl p-6 text-center">
                <Phone className="h-8 w-8 text-primary mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-1">Telefone</p>
                <p className="font-medium">{shop.phone}</p>
              </div>
            )}
            {shop.address && (
              <div className="bg-card border border-border rounded-xl p-6 text-center">
                <MapPin className="h-8 w-8 text-primary mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-1">Endereço</p>
                <p className="font-medium">{shop.address}</p>
              </div>
            )}
          </div>
          {(instagramUrl || facebookUrl || whatsappUrl) && (
            <div className="flex items-center justify-center gap-3 mt-8">
              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noreferrer" className="h-11 w-11 rounded-full border border-border bg-card hover:border-primary hover:text-primary transition-colors flex items-center justify-center">
                  <Instagram className="h-5 w-5" />
                </a>
              )}
              {facebookUrl && (
                <a href={facebookUrl} target="_blank" rel="noreferrer" className="h-11 w-11 rounded-full border border-border bg-card hover:border-primary hover:text-primary transition-colors flex items-center justify-center">
                  <Facebook className="h-5 w-5" />
                </a>
              )}
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noreferrer" className="h-11 w-11 rounded-full border border-border bg-card hover:border-primary hover:text-primary transition-colors flex items-center justify-center">
                  <MessageCircle className="h-5 w-5" />
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Map */}
      {mapSrc && (
        <section className="pb-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="rounded-2xl overflow-hidden border border-border shadow-lg">
              <iframe src={mapSrc} title={`Mapa - ${shop.name}`} className="w-full h-[420px] border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
            </div>
          </div>
        </section>
      )}

      <footer className="py-8 px-4 border-t border-border text-center text-muted-foreground text-sm">
        © {new Date().getFullYear()} {shop.name} — Todos os direitos reservados.
      </footer>
    </div>
  );
}
