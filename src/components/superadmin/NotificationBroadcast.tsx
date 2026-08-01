import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Trash2, Megaphone } from "lucide-react";
import { toast } from "sonner";

interface ShopOption { id: string; name: string; owner_id: string }

interface Sent {
  id: string; title: string; body: string; level: string;
  target_owner_id: string | null; created_at: string;
}

export function NotificationBroadcast({ shops, userId }: { shops: ShopOption[]; userId: string }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState("info");
  const [target, setTarget] = useState("all");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<Sent[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id,title,body,level,target_owner_id,created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setSent(data || []);
  };

  useEffect(() => { load(); }, []);

  const send = async () => {
    if (!title.trim() || !body.trim()) { toast.error("Preencha título e mensagem"); return; }
    setSending(true);
    const { error } = await supabase.from("notifications").insert({
      title: title.trim(),
      body: body.trim(),
      level,
      target_owner_id: target === "all" ? null : target,
      created_by: userId,
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Notificação enviada");
    setTitle(""); setBody("");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Apagar esta notificação?")) return;
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Apagada");
    load();
  };

  const shopName = (ownerId: string | null) =>
    ownerId ? (shops.find((s) => s.owner_id === ownerId)?.name || "Barbearia específica") : "Todas as barbearias";

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-primary" />
        <p className="font-display text-lg">Enviar notificação aos donos</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Título</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Manutenção programada" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Informação</SelectItem>
                <SelectItem value="warning">Atenção</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Destinatário</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as barbearias</SelectItem>
                {shops.map((s) => (
                  <SelectItem key={s.id} value={s.owner_id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <Label>Mensagem</Label>
        <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escreva o aviso que os donos verão no painel…" />
      </div>

      <Button onClick={send} disabled={sending} className="gap-1">
        <Send className="h-4 w-4" /> {sending ? "Enviando…" : "Enviar notificação"}
      </Button>

      {sent.length > 0 && (
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-sm text-muted-foreground">Últimos avisos enviados</p>
          {sent.map((n) => (
            <div key={n.id} className="flex items-start gap-2 text-sm border border-border rounded-lg p-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{n.title}</span>
                  <Badge variant="outline" className="text-[10px]">{shopName(n.target_owner_id)}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString("pt-BR")}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(n.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
