import { useState } from "react";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";
import { NotificationLetter } from "@/components/NotificationLetter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCheck, Info, AlertTriangle, Megaphone, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const levelMeta: Record<string, { icon: typeof Info; label: string; cls: string }> = {
  info: { icon: Info, label: "Informação", cls: "bg-primary/15 text-primary border-primary/30" },
  warning: { icon: AlertTriangle, label: "Atenção", cls: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  urgent: { icon: Megaphone, label: "Urgente", cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

export default function AdminNotificacoes() {
  const { items, loading, unread, markRead, markAllRead } = useNotifications();
  const [openLetter, setOpenLetter] = useState<AppNotification | null>(null);

  const openNotification = (n: AppNotification) => {
    setOpenLetter(n);
    if (!n.read) markRead(n.id);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-3xl gold-text flex items-center gap-2">
            <Bell className="h-7 w-7" /> Notificações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Avisos da administração do aplicativo e alertas da sua barbearia.</p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" className="gap-1" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" /> Marcar todas como lidas
          </Button>
        )}
      </header>

      {loading ? (
        <div className="p-10 text-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Carregando…
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          Nenhuma notificação por aqui.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((n, i) => {
            const meta = levelMeta[n.level] || levelMeta.info;
            const Icon = meta.icon;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => openNotification(n)}
                className={`bg-card border rounded-xl p-4 flex gap-3 cursor-pointer hover:border-primary/60 hover:shadow-md transition-all ${n.read ? "border-border opacity-70" : "border-primary/40"}`}
              >
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center border shrink-0 ${meta.cls}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{n.title}</p>
                    <Badge variant="outline" className="text-[10px]">{meta.label}</Badge>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.body}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString("pt-BR")}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openNotification(n); }}>Abrir</Button>
              </motion.div>
            );
          })}
        </div>
      )}

      <NotificationLetter
        notification={openLetter}
        open={!!openLetter}
        onOpenChange={(v) => !v && setOpenLetter(null)}
        onMarkRead={markRead}
      />
    </div>
  );
}
