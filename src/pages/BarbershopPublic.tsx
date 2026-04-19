import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Scissors, Star, Check, MapPin, Phone, Loader2, Crown } from "lucide-react";
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
}

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  popular: boolean;
}

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
      setShop(b as Barbershop);

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
      navigate(`/cliente/login?redirect=/site/${slug}`);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            <span className="font-display text-xl gold-text tracking-wider">{shop.name}</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/cliente"><Button size="sm" variant="outline">Meu Portal</Button></Link>
            ) : (
              <Link to={`/cliente/login?redirect=/site/${slug}`}>
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
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/30">
            <Star className="h-3 w-3 mr-1 fill-primary" /> Barbearia Premium
          </Badge>
          <h1 className="font-display text-5xl md:text-7xl gold-text tracking-wider mb-4">
            {shop.name}
          </h1>
          {shop.description && (
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">{shop.description}</p>
          )}
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            {shop.address && (
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" /> {shop.address}</span>
            )}
            {shop.phone && (
              <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-primary" /> {shop.phone}</span>
            )}
          </div>
        </motion.div>
      </section>

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

      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} {shop.name} — Powered by Barber Pro
      </footer>
    </div>
  );
}
