import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Users, Mail, Phone, CalendarCheck, Crown, Search, UserPlus, Trash2, Loader2, MessageCircle, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatCard } from "@/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Client {
  user_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  subscription: {
    status: string;
    started_at: string;
    expires_at: string | null;
    plan_name: string;
    plan_price: number;
  } | null;
  last_appointment: {
    date: string;
    time: string;
    service: string;
    status: string;
  } | null;
}

const daysUntil = (iso?: string | null) => {
  if (!iso) return null;
  const diff = (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return Math.ceil(diff);
};

export default function AdminClientes() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shopName, setShopName] = useState<string>("");

  const [form, setForm] = useState({ full_name: "", email: "", password: "", phone: "" });

  const callFn = async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke("create-admin-user", {
      body,
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.error) throw new Error(res.error.message);
    if ((res.data as any)?.error) throw new Error((res.data as any).error);
    return res.data;
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke("admin-list-clients");
    setClients((data?.clients || []) as Client[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    load();
    supabase.from("barbershops").select("name").eq("owner_id", user.id).maybeSingle().then(({ data }) => {
      if (data?.name) setShopName(data.name);
    });
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await callFn({
        action: "create",
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        role: "user",
      });
      toast.success("Cliente cadastrado!");
      setOpen(false);
      setForm({ full_name: "", email: "", password: "", phone: "" });
      load();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar cliente");
    }
    setSaving(false);
  };

  const handleDelete = async (c: Client) => {
    if (!confirm(`Remover ${c.full_name}? Esta ação é irreversível.`)) return;
    try {
      await callFn({ action: "delete", user_id: c.user_id });
      toast.success("Cliente removido");
      load();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const renewLink = (c: Client) => {
    const phone = (c.phone || "").replace(/\D/g, "");
    if (!phone) {
      toast.error("Cliente sem telefone cadastrado");
      return;
    }
    const expires = c.subscription?.expires_at ? new Date(c.subscription.expires_at).toLocaleDateString("pt-BR") : "";
    const site = window.location.origin + "/cliente/login";
    const msg =
      `Olá ${c.full_name.split(" ")[0]}! 👋\n\n` +
      `Sua assinatura ${shopName ? `na ${shopName} ` : ""}` +
      `${c.subscription?.plan_name ? `(${c.subscription.plan_name}) ` : ""}` +
      `${expires ? `vence em ${expires}. ` : "está perto do vencimento. "}` +
      `Para renovar e continuar aproveitando, acesse: ${site}\n\nObrigado!`;
    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    if (!t) return clients;
    return clients.filter((c) =>
      c.full_name.toLowerCase().includes(t) ||
      (c.email || "").toLowerCase().includes(t) ||
      (c.phone || "").toLowerCase().includes(t),
    );
  }, [clients, search]);

  const active = clients.filter((c) => c.subscription?.status === "ativo").length;
  const withAppts = clients.filter((c) => c.last_appointment).length;
  const expiring = clients.filter((c) => {
    const d = daysUntil(c.subscription?.expires_at);
    return c.subscription?.status === "ativo" && d !== null && d <= 7;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-4xl font-display gold-text">Clientes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cadastre, remova e consulte clientes. Avise sobre vencimento da assinatura via WhatsApp.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gold-gradient text-primary-foreground">
              <UserPlus className="mr-2 h-4 w-4" /> Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Cadastrar Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3 mt-2">
              <Input placeholder="Nome completo" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              <Input type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <Input placeholder="WhatsApp (com DDD, só números)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input type="password" placeholder="Senha de acesso" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Cadastrar cliente"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard title="Total" value={String(clients.length)} icon={Users} index={0} />
        <StatCard title="Assinantes" value={String(active)} icon={Crown} index={1} />
        <StatCard title="Com Agendamento" value={String(withAppts)} icon={CalendarCheck} index={2} />
        <StatCard title="Vencendo em 7 dias" value={String(expiring.length)} icon={AlertTriangle} index={3} />
      </div>

      {expiring.length > 0 && (
        <div className="bg-warning/5 border border-warning/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="font-display tracking-wide">Renovações próximas</h3>
          </div>
          <div className="space-y-2">
            {expiring.map((c) => (
              <div key={c.user_id} className="flex items-center justify-between gap-2 text-sm bg-card p-3 rounded-lg">
                <div>
                  <p className="font-medium">{c.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.subscription?.plan_name} • vence em {new Date(c.subscription!.expires_at!).toLocaleDateString("pt-BR")} ({daysUntil(c.subscription?.expires_at)}d)
                  </p>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => renewLink(c)} disabled={!c.phone}>
                  <MessageCircle className="h-3.5 w-3.5" /> Avisar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, email ou telefone"
          className="bg-secondary border-border pl-9"
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando clientes...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhum cliente encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((c, i) => (
            <motion.div
              key={c.user_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-card border border-border rounded-lg p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-xl tracking-wide">{c.full_name}</h3>
                  <div className="flex flex-col gap-1 mt-1 text-xs text-muted-foreground">
                    {c.email && <span className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {c.email}</span>}
                    {c.phone && <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {c.phone}</span>}
                  </div>
                </div>
                {c.subscription && (
                  <span
                    className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${
                      c.subscription.status === "ativo"
                        ? "bg-success/10 text-success"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {c.subscription.status}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Assinatura</p>
                  {c.subscription ? (
                    <div>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Crown className="h-3.5 w-3.5 text-primary" /> {c.subscription.plan_name}
                      </p>
                      <p className="text-xs text-muted-foreground">R$ {c.subscription.plan_price.toFixed(2)}</p>
                      {c.subscription.expires_at && (
                        <p className="text-[10px] text-muted-foreground">
                          Vence: {new Date(c.subscription.expires_at).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sem plano</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Último Agendamento</p>
                  {c.last_appointment ? (
                    <div>
                      <p className="text-sm font-medium">{c.last_appointment.service}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.last_appointment.date).toLocaleDateString("pt-BR")} às {c.last_appointment.time}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Nenhum</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-border/50">
                <Button size="sm" variant="outline" className="flex-1 gap-1.5" disabled={!c.phone} onClick={() => renewLink(c)}>
                  <MessageCircle className="h-3.5 w-3.5" /> Avisar vencimento
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(c)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
