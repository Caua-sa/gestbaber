import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Scissors, Star, Check, MapPin, Phone, Loader2, Crown, Instagram, Facebook, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Barbershop {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  instagram: string | null;
  facebook: string | null;
  whatsapp: string | null;
  map_embed_url: string | null;
  photos: string[];
}

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  popular: boolean;
}

const SHOP_CONTEXT_KEY = "barberpro:client-barbershop";

const normalizeSocialUrl = (raw: string | null, kind: "instagram" | "facebook" | "whatsapp") => {
  if (!raw) return null;
  const v = raw.trim();
  if (!v) return null;
  if (v.startsWith("http")) return v;
  if (kind === "instagram") return `https://instagram.com/${v.replace(/^@/, "")}`;
  if (kind === "facebook") return `https://facebook.com/${v}`;
  if (kind === "whatsapp") return `https://wa.me/${v.replace(/\D/g, "")}`;
  return v;
};

export default function BarbershopPublic() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shop, setShop] = useState<Barbershop | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: b } = await supabase
        .from("barbershops")
        .select("*")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();
      if (!b) { setLoading(false); return; }
      const shopData = { ...b, photos: Array.isArray(b.photos) ? b.photos : [] } as Barbershop;
      setShop(shopData);
      localStorage.setItem(SHOP_CONTEXT_KEY, JSON.stringify({ id: b.id, slug: b.slug }));

      const { data: p } = await supabase
        .from("plans")
        .select("*")
        .eq("barbershop_id", b.id)
        .eq("active", true)
        .order("price");
      if (p) setPlans(p.map((x: any) => ({ ...x, features: x.features || [] })));
      setLoading(false);
    })();
  }, [slug]);

  const subscribe = async (planId: string) => {
    if (!user) {
      toast.info("Faça login para assinar");
      navigate(`/cliente/login?redirect=${encodeURIComponent(`/cliente?tab=planos&shop=${slug}`)}`);
      return;
    }
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
        <h1 className="font-display text-3xl gold-text mb-2">Barbearia não encontrada</h1>
        <p className="text-muted-foreground mb-6">A URL "/site/{slug}" não existe ou está inativa.</p>
        <Link to="/cliente/login">
          <Button>Voltar</Button>
        </Link>
      </div>
    );
  }

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const instagramUrl = normalizeSocialUrl(shop.instagram, "instagram");
  const facebookUrl = normalizeSocialUrl(shop.facebook, "facebook");
  const whatsappUrl = normalizeSocialUrl(shop.whatsapp, "whatsapp");
  const mapSrc = shop.map_embed_url
    || (shop.address ? `https://www.google.com/maps?q=${encodeURIComponent(shop.address)}&output=embed` : null);

  return (
    <div className="min-h-screen bg-background">
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
          <div className="flex items-center gap-3">
            {user ? (
              <Link to={`/cliente?shop=${slug}`}><Button size="sm" variant="outline">Meu Portal</Button></Link>
            ) : (
              <Link to={`/cliente/login?redirect=${encodeURIComponent(`/cliente?shop=${slug}`)}`}>
                <Button size="sm" className="gold-gradient text-primary-foreground font-semibold">Entrar</Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(38_92%_50%/0.1),transparent_60%)]" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto text-center relative"
        >
          {shop.logo_url && (
            <img src={shop.logo_url} alt={shop.name} className="h-24 w-24 mx-auto mb-6 rounded-2xl object-cover border-2 border-primary/30 shadow-xl" />
          )}
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">
            <Star className="h-3 w-3 mr-1 fill-primary" /> Barbearia Premium
          </Badge>
          <h1 className="font-display text-5xl md:text-7xl gold-text tracking-wider mb-4">
            {shop.name}
          </h1>
          {shop.description && (
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">{shop.description}</p>
          )}
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground flex-wrap">
            {shop.address && (
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" /> {shop.address}</span>
            )}
            {shop.phone && (
              <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-primary" /> {shop.phone}</span>
            )}
          </div>

          {(instagramUrl || facebookUrl || whatsappUrl) && (
            <div className="flex items-center justify-center gap-3 mt-6">
              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noreferrer" className="h-10 w-10 rounded-full border border-border bg-card hover:border-primary hover:text-primary transition-colors flex items-center justify-center">
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {facebookUrl && (
                <a href={facebookUrl} target="_blank" rel="noreferrer" className="h-10 w-10 rounded-full border border-border bg-card hover:border-primary hover:text-primary transition-colors flex items-center justify-center">
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noreferrer" className="h-10 w-10 rounded-full border border-border bg-card hover:border-primary hover:text-primary transition-colors flex items-center justify-center">
                  <MessageCircle className="h-4 w-4" />
                </a>
              )}
            </div>
          )}
        </motion.div>
      </section>

      {/* Galeria */}
      {shop.photos && shop.photos.length > 0 && (
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-3xl gold-text tracking-wide text-center mb-8">Galeria</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {shop.photos.map((url, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="aspect-square rounded-xl overflow-hidden border border-border"
                >
                  <img src={url} alt={`${shop.name} ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Plans */}
      <section className="py-16 px-4 bg-secondary/20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Crown className="h-10 w-10 text-primary mx-auto mb-3" />
            <h2 className="font-display text-4xl gold-text tracking-wide mb-2">Assine um Plano</h2>
            <p className="text-muted-foreground">Cobrança recorrente segura via Mercado Pago. Cancele quando quiser.</p>
          </motion.div>

          {plans.length === 0 ? (
            <p className="text-center text-muted-foreground">Nenhum plano disponível no momento.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className={`relative bg-card border rounded-2xl p-7 flex flex-col ${
                    p.popular ? "border-primary ring-2 ring-primary/30 scale-[1.02]" : "border-border"
                  }`}
                >
                  {p.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gold-gradient text-primary-foreground">
                      Mais popular
                    </Badge>
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
                    {subscribing === p.id ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Redirecionando...</>
                    ) : (
                      "Assinar agora"
                    )}
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Mapa */}
      {mapSrc && (
        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-3xl gold-text tracking-wide text-center mb-2 flex items-center justify-center gap-2">
              <MapPin className="h-6 w-6" /> Onde estamos
            </h2>
            {shop.address && <p className="text-center text-muted-foreground text-sm mb-6">{shop.address}</p>}
            <div className="rounded-2xl overflow-hidden border border-border shadow-lg">
              <iframe
                src={mapSrc}
                title={`Mapa - ${shop.name}`}
                className="w-full h-[420px] border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      )}

      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} {shop.name} — Powered by Barber Pro
      </footer>
    </div>
  );
}
