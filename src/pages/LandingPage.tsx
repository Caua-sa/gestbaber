import { Link } from "react-router-dom";
import { Scissors, Clock, MapPin, Phone, Instagram, Star, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLandingSettings, getSettingValue } from "@/hooks/useLandingSettings";

export default function LandingPage() {
  const { data: settings, isLoading } = useLandingSettings();

  const g = (section: string, key: string, fallback = "") =>
    getSettingValue(settings, section, key, fallback);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Scissors className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const services = [1, 2, 3, 4].map((i) => ({
    name: g("services", `service_${i}_name`, `Serviço ${i}`),
    price: g("services", `service_${i}_price`, "R$ --"),
    desc: g("services", `service_${i}_desc`, ""),
  }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            <span className="font-display text-2xl gold-text tracking-wider">
              {g("hero", "title", "BARBER PRO")}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#services" className="hover:text-primary transition-colors">Serviços</a>
            <a href="#plans" className="hover:text-primary transition-colors">Planos</a>
            <a href="#about" className="hover:text-primary transition-colors">Sobre</a>
            <a href="#contact" className="hover:text-primary transition-colors">Contato</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/cliente/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Entrar
              </Button>
            </Link>
            <Link to="/cliente/login">
              <Button size="sm" className="gold-gradient text-primary-foreground font-semibold">
                {g("hero", "cta_text", "Agendar Agora")}
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(38_92%_50%/0.08),transparent_60%)]" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm mb-8">
            <Sparkles className="h-4 w-4" />
            <span>Barbearia Premium</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-display gold-text leading-none mb-6">
            {g("hero", "title", "BARBER PRO")}
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10">
            {g("hero", "subtitle", "Estilo e precisão em cada corte")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/cliente/login">
              <Button size="lg" className="gold-gradient text-primary-foreground font-bold text-lg px-8 py-6 shadow-lg shadow-primary/20">
                {g("hero", "cta_text", "Agendar Agora")}
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/cliente/login">
              <Button size="lg" variant="outline" className="border-border text-foreground px-8 py-6 text-lg">
                Ver Planos
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-center gap-1 mt-8 text-primary">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-primary" />
            ))}
            <span className="ml-2 text-muted-foreground text-sm">+500 clientes satisfeitos</span>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-20 px-4 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-display gold-text text-center mb-4">
            {g("services", "title", "Nossos Serviços")}
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">
            Serviços profissionais para o homem moderno
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((s, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/40 hover:card-glow transition-all duration-300 group"
              >
                <div className="h-12 w-12 rounded-lg gold-gradient flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Scissors className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-display text-xl tracking-wide mb-1">{s.name}</h3>
                <p className="text-primary font-bold text-lg mb-2">{s.price}</p>
                <p className="text-muted-foreground text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-display gold-text mb-4">Planos de Assinatura</h2>
          <p className="text-muted-foreground mb-10 max-w-lg mx-auto">
            Assine e tenha benefícios exclusivos todos os meses
          </p>
          <Link to="/cliente/login">
            <Button size="lg" className="gold-gradient text-primary-foreground font-bold text-lg px-10 py-6">
              Conhecer Planos
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20 px-4 bg-card/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-display gold-text mb-6">
            {g("about", "title", "Sobre Nós")}
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {g("about", "description", "")}
          </p>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-display gold-text text-center mb-12">Contato</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <Phone className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">Telefone</p>
              <p className="font-medium">{g("contact", "phone", "(11) 99999-9999")}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <MapPin className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">Endereço</p>
              <p className="font-medium">{g("contact", "address", "")}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <Clock className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">Horário</p>
              <p className="font-medium">{g("contact", "hours", "")}</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mt-8 text-muted-foreground">
            <Instagram className="h-5 w-5" />
            <span>{g("contact", "instagram", "@barberpro")}</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border text-center text-muted-foreground text-sm">
        {g("footer", "text", "© 2026 Barber Pro. Todos os direitos reservados.")}
      </footer>
    </div>
  );
}
