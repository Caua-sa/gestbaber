import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link2, Copy, Trash2, ExternalLink, Inbox, MessageCircle, Check, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAccountOwner } from "@/hooks/useAccountOwner";
import { toast } from "sonner";

const randCode = () => Math.random().toString(36).slice(2, 8);
const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Copiado!"); };

export default function AdminLinks() {
  const { ownerId } = useAccountOwner();
  const [slug, setSlug] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [url, setUrl] = useState("");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const origin = window.location.origin;
  const bookingUrl = slug ? `${origin}/agendar/${slug}` : "";

  const load = async () => {
    if (!ownerId) return;
    const [{ data: b }, { data: r }, { data: l }] = await Promise.all([
      supabase.from("barbershops").select("slug").eq("owner_id", ownerId).maybeSingle(),
      supabase.from("guest_bookings").select("*").order("created_at", { ascending: false }),
      supabase.from("short_links").select("*").order("created_at", { ascending: false }),
    ]);
    setSlug(b?.slug || null); setRequests(r || []); setLinks(l || []);
  };
  useEffect(() => { load(); }, [ownerId]);

  const createLink = async (target = url, t = title) => {
    if (!ownerId || !/^https?:\/\//.test(target)) { toast.error("Informe um link começando com http(s)://"); return; }
    const c = (code.trim() || randCode()).toLowerCase().replace(/[^a-z0-9-]/g, "");
    const { error } = await supabase.from("short_links").insert({ owner_id: ownerId, code: c, target_url: target, title: t || null });
    if (error) { toast.error(error.message.includes("duplicate") ? "Esse código já existe" : error.message); return; }
    copy(`${origin}/l/${c}`); setUrl(""); setCode(""); setTitle(""); load();
  };

  const setStatus = async (id: string, status: string) => {
    await supabase.from("guest_bookings").update({ status }).eq("id", id); load();
  };
  const delReq = async (id: string) => { await supabase.from("guest_bookings").delete().eq("id", id); load(); };
  const delLink = async (id: string) => { await supabase.from("short_links").delete().eq("id", id); load(); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl gold-text">Links & Pedidos</h1>
        <p className="text-muted-foreground text-sm">Agendamento sem cadastro e encurtador de links</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-primary/30 rounded-xl p-5">
        <p className="text-sm font-medium mb-2">Link de agendamento rápido (envie para possíveis clientes)</p>
        {slug ? (
          <div className="flex flex-wrap gap-2">
            <Input readOnly value={bookingUrl} className="flex-1 min-w-[220px]" />
            <Button variant="outline" onClick={() => copy(bookingUrl)} className="gap-1"><Copy className="h-4 w-4" />Copiar</Button>
            <Button variant="outline" asChild className="gap-1"><a href={bookingUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Abrir</a></Button>
            <Button onClick={() => createLink(bookingUrl, "Agendamento rápido")} className="gap-1 gold-gradient text-primary-foreground"><Link2 className="h-4 w-4" />Encurtar</Button>
          </div>
        ) : <p className="text-sm text-muted-foreground">Cadastre sua barbearia em "Minha Barbearia" primeiro.</p>}
      </motion.div>

      <Tabs defaultValue="pedidos">
        <TabsList>
          <TabsTrigger value="pedidos" className="gap-1"><Inbox className="h-4 w-4" />Pedidos ({requests.filter(r => r.status === "novo").length})</TabsTrigger>
          <TabsTrigger value="links" className="gap-1"><Link2 className="h-4 w-4" />Encurtador</TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos" className="space-y-3 mt-4">
          {requests.length === 0 && <p className="text-sm text-muted-foreground">Nenhum pedido ainda.</p>}
          {requests.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3 items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium flex items-center gap-2">{r.name}
                  <Badge variant={r.status === "novo" ? "default" : "secondary"}>{r.status}</Badge></p>
                <p className="text-xs text-muted-foreground">{r.service} · {r.barber} · {r.preferred_date && new Date(r.preferred_date + "T12:00").toLocaleDateString("pt-BR")} {r.preferred_time}</p>
                {r.phone && <p className="text-xs text-muted-foreground">{r.phone}</p>}
                {r.notes && <p className="text-xs italic text-muted-foreground">"{r.notes}"</p>}
              </div>
              <div className="flex gap-2">
                {r.phone && <Button size="sm" variant="outline" asChild className="gap-1"><a target="_blank" rel="noreferrer"
                  href={`https://wa.me/55${r.phone}?text=${encodeURIComponent(`Olá ${r.name}! Recebemos seu pedido de ${r.service} para ${r.preferred_time}.`)}`}><MessageCircle className="h-4 w-4" />Contatar</a></Button>}
                {r.status === "novo" && <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "atendido")} className="gap-1"><Check className="h-4 w-4" />Captado</Button>}
                <Button size="icon" variant="ghost" onClick={() => delReq(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </motion.div>
          ))}
        </TabsContent>

        <TabsContent value="links" className="space-y-4 mt-4">
          <div className="bg-card border border-border rounded-xl p-4 grid gap-2 md:grid-cols-[2fr_1fr_1fr_auto]">
            <Input placeholder="https://link-longo..." value={url} onChange={e => setUrl(e.target.value)} />
            <Input placeholder="Nome (opcional)" value={title} onChange={e => setTitle(e.target.value)} />
            <Input placeholder="Código (opcional)" value={code} onChange={e => setCode(e.target.value)} />
            <Button onClick={() => createLink()} className="gold-gradient text-primary-foreground">Encurtar</Button>
          </div>
          {links.map(l => {
            const short = `${origin}/l/${l.code}`;
            return (
              <div key={l.id} className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3 items-center justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-primary">{short}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-md">{l.title ? `${l.title} — ` : ""}{l.target_url}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><MousePointerClick className="h-3 w-3" />{l.clicks}</span>
                  <Button size="sm" variant="outline" onClick={() => copy(short)} className="gap-1"><Copy className="h-4 w-4" />Copiar</Button>
                  <Button size="icon" variant="ghost" onClick={() => delLink(l.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
