import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, Calendar, LogOut, ShoppingBag, Sparkles, Scissors, Clock, MapPin, X, CheckCircle2, AlertCircle, Loader2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ClientePlanos } from "@/components/cliente/ClientePlanos";
import { ClienteAgendamento } from "@/components/cliente/ClienteAgendamento";
import { ClienteMeusAgendamentos } from "@/components/cliente/ClienteMeusAgendamentos";
import { ClienteLoja } from "@/components/cliente/ClienteLoja";
import { ClienteChat } from "@/components/cliente/ClienteChat";
import { ClientePerfil } from "@/components/cliente/ClientePerfil";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type Tab = "inicio" | "loja" | "planos" | "agendar" | "meus-agendamentos" | "perfil";

interface ActiveSub {
  id: string;
  status: string;
  cancel_mode: string | null;
  plan: { name: string; price: number; period: string } | null;
  mp: { id: string; status: string; next_payment_date: string | null } | null;
}

export default function ClientePortal() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("inicio");
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const t = searchParams.get("tab") as Tab | null;
    if (t && ["inicio","loja","planos","agendar","meus-agendamentos","perfil"].includes(t)) setTab(t);
  }, [searchParams]);
  const [activeSub, setActiveSub] = useState<ActiveSub | null>(null);
  const [nextAppt, setNextAppt] = useState<any>(null);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [services, setServices] = useState<{ id: string; name: string; price: number; duration_min: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    const [subRes, apptRes, profRes] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("id, status, cancel_mode, plans(name, price, period)")
        .eq("user_id", user.id)
        .in("status", ["ativo", "cancelando", "pendente"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("appointments")
        .select("*")
        .eq("user_id", user.id)
        .gte("appointment_date", new Date().toISOString().split("T")[0])
        .order("appointment_date", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle(),
    ]);

    if (subRes.data) {
      const s: any = subRes.data;
      const { data: mp } = await supabase
        .from("mp_subscriptions")
        .select("id, status, next_payment_date")
        .eq("subscription_id", s.id)
        .maybeSingle();
      setActiveSub({
        id: s.id,
        status: s.status,
        cancel_mode: s.cancel_mode,
        plan: s.plans,
        mp,
      });
    } else {
      setActiveSub(null);
    }
    setNextAppt(apptRes.data);
    setProfile(profRes.data);

    // Load up to 4 services from the user's barbershop for the home preview
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("created_by")
      .eq("user_id", user.id)
      .maybeSingle();
    const ownerId = roleRow?.created_by;
    if (ownerId) {
      const { data: srv } = await supabase
        .from("services")
        .select("id, name, price, duration_min")
        .eq("owner_id", ownerId)
        .eq("active", true)
        .order("price")
        .limit(4);
      setServices((srv || []) as any);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleCancel = async (mode: "now" | "end_of_cycle") => {
    if (!activeSub?.mp) return;
    setCanceling(true);
    try {
      const { data, error } = await supabase.functions.invoke("mp-cancel-subscription", {
        body: { mp_subscription_id: activeSub.mp.id, mode },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success(
        mode === "now" ? "Assinatura cancelada — acesso encerrado." : "Cancelamento agendado para o fim do ciclo.",
      );
      setCancelOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cancelar");
    } finally {
      setCanceling(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "inicio", label: "Início", icon: Sparkles },
    { id: "agendar", label: "Agendar", icon: Calendar },
    { id: "meus-agendamentos", label: "Agendamentos", icon: Clock },
    { id: "planos", label: "Planos", icon: Crown },
    { id: "loja", label: "Loja", icon: ShoppingBag },
  ];

  const firstName = profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "cliente";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-display gold-text tracking-wider">BARBER PRO</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block capitalize">{firstName}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <Button
              key={t.id}
              variant={tab === t.id ? "default" : "outline"}
              onClick={() => setTab(t.id)}
              className="gap-2 shrink-0"
              size="sm"
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </Button>
          ))}
        </div>

        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {tab === "inicio" && (
            <div className="space-y-6">
              {/* Welcome */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-secondary/40 p-7"
              >
                <div className="absolute -top-12 -right-12 h-48 w-48 bg-primary/10 rounded-full blur-3xl" />
                <p className="text-sm text-muted-foreground">Olá,</p>
                <h2 className="font-display text-3xl gold-text tracking-wide capitalize mb-2">{firstName}</h2>
                <p className="text-muted-foreground text-sm max-w-md">
                  Bem-vindo ao seu portal. Acompanhe sua assinatura, agendamentos e produtos.
                </p>
              </motion.div>

              {/* Subscription card */}
              {loading ? (
                <div className="bg-card border border-border rounded-2xl p-6 animate-pulse h-32" />
              ) : activeSub && activeSub.plan ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`relative overflow-hidden rounded-2xl border-2 p-6 ${
                    activeSub.status === "ativo"
                      ? "border-primary bg-gradient-to-br from-primary/10 via-card to-card"
                      : activeSub.status === "cancelando"
                      ? "border-warning/40 bg-warning/5"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="absolute top-0 right-0 h-40 w-40 bg-primary/20 rounded-full blur-3xl -translate-y-12 translate-x-12" />

                  <div className="flex items-start justify-between mb-4 relative">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl gold-gradient flex items-center justify-center">
                        <Crown className="h-6 w-6 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">Plano ativo</p>
                        <h3 className="font-display text-2xl tracking-wide gold-text">{activeSub.plan.name}</h3>
                      </div>
                    </div>
                    <Badge
                      variant={activeSub.status === "ativo" ? "default" : "secondary"}
                      className={
                        activeSub.status === "ativo"
                          ? "gold-gradient text-primary-foreground"
                          : activeSub.status === "cancelando"
                          ? "bg-warning/20 text-warning border-warning/30"
                          : ""
                      }
                    >
                      {activeSub.status === "ativo" ? (
                        <><CheckCircle2 className="h-3 w-3 mr-1" /> Ativa</>
                      ) : activeSub.status === "cancelando" ? (
                        <><AlertCircle className="h-3 w-3 mr-1" /> Cancelando</>
                      ) : (
                        "Pendente"
                      )}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 relative">
                    <div>
                      <p className="text-xs text-muted-foreground">Valor</p>
                      <p className="font-display text-xl">
                        {Number(activeSub.plan.price).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                        <span className="text-xs text-muted-foreground">/{activeSub.plan.period}</span>
                      </p>
                    </div>
                    {activeSub.mp?.next_payment_date && (
                      <div>
                        <p className="text-xs text-muted-foreground">Próxima cobrança</p>
                        <p className="font-medium text-sm">
                          {format(new Date(activeSub.mp.next_payment_date), "dd MMM yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    )}
                  </div>

                  {activeSub.status === "cancelando" && (
                    <p className="text-xs text-warning mb-3">
                      Sua assinatura foi cancelada. Você mantém acesso até o fim do ciclo atual.
                    </p>
                  )}

                  {activeSub.status === "ativo" && activeSub.mp && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive gap-1.5"
                      onClick={() => setCancelOpen(true)}
                    >
                      <X className="h-3.5 w-3.5" /> Cancelar assinatura
                    </Button>
                  )}
                  {activeSub.status === "pendente" && (
                    <p className="text-xs text-muted-foreground">
                      Aguardando confirmação do pagamento no Mercado Pago...
                    </p>
                  )}
                </motion.div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center">
                  <Crown className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm mb-3">Você ainda não tem um plano ativo</p>
                  <Button onClick={() => setTab("planos")} size="sm">Ver planos</Button>
                </div>
              )}

              {/* Next appointment */}
              {nextAppt ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Próximo agendamento</p>
                  <div className="flex items-center gap-4">
                    <div className="text-center bg-primary/10 rounded-lg p-3 min-w-[64px]">
                      <p className="text-2xl font-display gold-text leading-none">
                        {format(new Date(nextAppt.appointment_date + "T12:00:00"), "dd")}
                      </p>
                      <p className="text-[10px] uppercase text-muted-foreground tracking-wider">
                        {format(new Date(nextAppt.appointment_date + "T12:00:00"), "MMM", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{nextAppt.service}</p>
                      <p className="text-sm text-muted-foreground">com {nextAppt.barber}</p>
                      <p className="text-sm text-primary mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {nextAppt.appointment_time}
                      </p>
                    </div>
                    <Badge variant="secondary" className="capitalize">{nextAppt.status}</Badge>
                  </div>
                </motion.div>
              ) : (
                <div
                  onClick={() => setTab("agendar")}
                  className="rounded-2xl border border-dashed border-border p-5 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum agendamento próximo</p>
                  <p className="text-xs text-primary mt-1">Toque para agendar →</p>
                </div>
              )}

              {/* Services preview */}
              {services.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <Scissors className="h-3 w-3" /> Nossos serviços
                    </p>
                    <button onClick={() => setTab("agendar")} className="text-xs text-primary hover:underline">
                      Ver todos →
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {services.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setTab("agendar")}
                        className="text-left p-3 rounded-lg border border-border hover:border-primary transition-colors"
                      >
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                          <span className="text-primary font-semibold">
                            {Number(s.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {s.duration_min}min
                          </span>
                        </p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          )}


          {tab === "loja" && <ClienteLoja />}
          {tab === "planos" && <ClientePlanos />}
          {tab === "agendar" && <ClienteAgendamento />}
          {tab === "meus-agendamentos" && <ClienteMeusAgendamentos />}
        </motion.div>
      </div>

      {/* Cancel dialog */}
      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Cancelar assinatura?</AlertDialogTitle>
            <AlertDialogDescription>
              Escolha quando o cancelamento deve acontecer. Você pode assinar novamente quando quiser.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2">
            <button
              disabled={canceling}
              onClick={() => handleCancel("end_of_cycle")}
              className="w-full text-left p-4 rounded-lg border border-border hover:border-primary transition-colors disabled:opacity-50"
            >
              <p className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" /> Cancelar no fim do ciclo
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Você mantém os benefícios até{" "}
                {activeSub?.mp?.next_payment_date
                  ? format(new Date(activeSub.mp.next_payment_date), "dd 'de' MMM", { locale: ptBR })
                  : "o fim do período"}
                . Recomendado.
              </p>
            </button>

            <button
              disabled={canceling}
              onClick={() => handleCancel("now")}
              className="w-full text-left p-4 rounded-lg border border-border hover:border-destructive transition-colors disabled:opacity-50"
            >
              <p className="font-medium flex items-center gap-2">
                <X className="h-4 w-4 text-destructive" /> Cancelar agora
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Os benefícios e cobranças param imediatamente. Sem reembolso proporcional.
              </p>
            </button>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={canceling}>Voltar</AlertDialogCancel>
          </AlertDialogFooter>
          {canceling && (
            <p className="text-xs text-muted-foreground flex items-center gap-2 justify-center">
              <Loader2 className="h-3 w-3 animate-spin" /> Cancelando no Mercado Pago...
            </p>
          )}
        </AlertDialogContent>
      </AlertDialog>

      <ClienteChat />
    </div>
  );
}
