import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Scissors, CalendarDays, Wallet, Users, MessageCircle, BarChart3, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import heroImage from "@/assets/barbershop-grooming.jpg";
import "@/styles/landing.css";

const features = [
  { icon: CalendarDays, title: "Agenda online", text: "Link de agendamento, horários bloqueados e lembretes automáticos." },
  { icon: Wallet, title: "Financeiro completo", text: "Caixa, comandas, cupom não fiscal e lucro em tempo real." },
  { icon: Users, title: "Clientes e assinaturas", text: "Planos mensais com cobrança recorrente e alertas de renovação." },
  { icon: MessageCircle, title: "WhatsApp", text: "Avisos de agendamento e mensagens de aniversário." },
  { icon: BarChart3, title: "Dashboard", text: "Faturamento, margens e ganhos de cada barbeiro." },
  { icon: Scissors, title: "Site próprio", text: "Página da sua barbearia com serviços, planos e equipe." },
];

const plans = [
  { name: "Básico", price: "49,90", items: ["1 barbeiro", "Agenda e link de agendamento", "Financeiro"] },
  { name: "Profissional", price: "89,90", popular: true, items: ["Até 5 barbeiros", "Assinaturas de clientes", "Comandas e estoque", "Site próprio"] },
  { name: "Premium", price: "139,90", items: ["Barbeiros ilimitados", "Tudo do Profissional", "WhatsApp e Tela TV", "Suporte prioritário"] },
];

export default function GestBarberHome() {
  const [f, setF] = useState({ name: "", barbershop_name: "", phone: "", email: "", city: "" });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || !f.barbershop_name.trim() || f.phone.replace(/\D/g, "").length < 8) {
      toast.error("Preencha nome, barbearia e WhatsApp.");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("trial_requests").insert({
      name: f.name.trim(), barbershop_name: f.barbershop_name.trim(), phone: f.phone.trim(),
      email: f.email.trim() || null, city: f.city.trim() || null,
    });
    setSending(false);
    if (error) { toast.error("Não foi possível enviar. Tente de novo."); return; }
    setDone(true);
  };

  return (
    <div className="public-landing min-h-screen bg-background text-foreground">
      <header className="landing-nav sticky top-0 z-40 border-b border-border/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 font-display text-2xl tracking-wide">
            <Scissors className="h-6 w-6 text-primary" /> GestBarber
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/admin/login">Entrar</Link></Button>
            <Button asChild size="sm"><a href="#teste">Teste grátis</a></Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <img src={heroImage} alt="Barbearia" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative mx-auto max-w-6xl px-4 py-20 md:py-32">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 px-3 py-1 text-xs uppercase tracking-widest text-primary">
            <Sparkles className="h-3 w-3" /> 3 dias grátis
          </span>
          <h1 className="mt-4 font-display text-5xl leading-none md:text-7xl">
            O sistema completo<br /><span className="text-primary">para sua barbearia</span>
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Agenda, financeiro, assinaturas, comandas e site próprio em um só lugar. Teste por 3 dias e depois escolha seu plano mensal.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><a href="#teste">Quero testar grátis</a></Button>
            <Button asChild size="lg" variant="outline"><a href="#planos">Ver planos</a></Button>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-4xl">Tudo que você precisa</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((x, i) => (
            <motion.div key={x.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card p-5">
              <x.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-3 font-semibold">{x.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{x.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="planos" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-4xl">Planos mensais</h2>
        <p className="text-sm text-muted-foreground">Valores ilustrativos.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <div key={p.name} className={`rounded-xl border bg-card p-6 ${p.popular ? "border-primary" : "border-border"}`}>
              {p.popular && <span className="text-xs uppercase tracking-widest text-primary">Mais escolhido</span>}
              <h3 className="font-display text-3xl">{p.name}</h3>
              <p className="mt-2 text-3xl font-bold text-primary">R$ {p.price}<span className="text-sm text-muted-foreground">/mês</span></p>
              <ul className="mt-4 space-y-2 text-sm">
                {p.items.map((it) => <li key={it} className="flex gap-2"><Check className="h-4 w-4 text-primary" />{it}</li>)}
              </ul>
              <Button asChild className="mt-6 w-full" variant={p.popular ? "default" : "outline"}><a href="#teste">Começar teste</a></Button>
            </div>
          ))}
        </div>
      </section>

      <section id="teste" className="mx-auto max-w-xl px-4 py-16">
        <div className="rounded-xl border border-primary/40 bg-card p-6">
          {done ? (
            <div className="text-center">
              <Check className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-2 font-display text-3xl">Pedido recebido!</h2>
              <p className="text-sm text-muted-foreground">Vamos chamar você no WhatsApp para liberar seus 3 dias grátis.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <h2 className="font-display text-3xl">Peça seu teste grátis de 3 dias</h2>
              <Input placeholder="Seu nome *" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={120} />
              <Input placeholder="Nome da barbearia *" value={f.barbershop_name} onChange={(e) => setF({ ...f, barbershop_name: e.target.value })} maxLength={120} />
              <Input placeholder="WhatsApp *" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} maxLength={30} />
              <Input placeholder="E-mail" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} maxLength={160} />
              <Input placeholder="Cidade" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} maxLength={80} />
              <Button type="submit" className="w-full" disabled={sending}>
                {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Quero testar grátis
              </Button>
            </form>
          )}
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} GestBarber</footer>
    </div>
  );
}
