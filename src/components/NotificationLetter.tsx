import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Scissors, Info, AlertTriangle, Megaphone, CheckCheck } from "lucide-react";
import type { AppNotification } from "@/hooks/useNotifications";

const levelMeta: Record<string, { icon: typeof Info; label: string; cls: string }> = {
  info: { icon: Info, label: "Informação", cls: "text-primary" },
  warning: { icon: AlertTriangle, label: "Atenção", cls: "text-amber-500" },
  urgent: { icon: Megaphone, label: "Urgente", cls: "text-destructive" },
};

export function NotificationLetter({
  notification,
  open,
  onOpenChange,
  onMarkRead,
}: {
  notification: AppNotification | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onMarkRead?: (id: string) => void;
}) {
  if (!notification) return null;
  const meta = levelMeta[notification.level] || levelMeta.info;
  const Icon = meta.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 bg-transparent border-0 shadow-none">
        <motion.div
          initial={{ rotateX: -75, opacity: 0, y: -30 }}
          animate={{ rotateX: 0, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 14 }}
          style={{ transformPerspective: 1000, transformOrigin: "top center" }}
          className="relative rounded-lg border border-primary/40 bg-card shadow-2xl overflow-hidden"
        >
          {/* Envelope flap accent */}
          <div className="h-2 w-full bg-gradient-to-r from-primary/60 via-primary to-primary/60" />

          {/* Wax seal */}
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.25, type: "spring", stiffness: 200 }}
            className="absolute right-6 top-6 h-14 w-14 rounded-full bg-primary/20 border-2 border-primary/60 flex items-center justify-center shadow-lg"
          >
            <Scissors className="h-6 w-6 text-primary" />
          </motion.div>

          <div className="p-8 space-y-5">
            <div className="space-y-1 pr-20">
              <p className={`text-[11px] uppercase tracking-[0.25em] flex items-center gap-1.5 ${meta.cls}`}>
                <Icon className="h-3.5 w-3.5" /> {meta.label}
              </p>
              <h2 className="font-display text-3xl gold-text tracking-wide">{notification.title}</h2>
              <p className="text-xs text-muted-foreground">
                {new Date(notification.created_at).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" })}
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-primary/50 to-transparent" />

            <div className="relative">
              <span className="absolute -left-1 -top-4 font-display text-5xl text-primary/25 select-none">“</span>
              <p className="text-[15px] leading-relaxed text-foreground/90 whitespace-pre-wrap pl-5 italic">
                {notification.body}
              </p>
            </div>

            <div className="pt-2 border-t border-border flex items-end justify-between gap-3 flex-wrap">
              <div>
                <p className="font-display text-lg gold-text">Administração do App</p>
                <p className="text-[11px] text-muted-foreground">Comunicado oficial • GestBarber</p>
              </div>
              <div className="flex gap-2">
                {!notification.read && onMarkRead && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => onMarkRead(notification.id)}>
                    <CheckCheck className="h-4 w-4" /> Marcar lida
                  </Button>
                )}
                <Button size="sm" onClick={() => onOpenChange(false)}>Fechar</Button>
              </div>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
