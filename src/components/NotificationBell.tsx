import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications } from "@/hooks/useNotifications";

export function NotificationBell() {
  const { items, unread, markRead } = useNotifications();
  const navigate = useNavigate();
  const latest = items.slice(0, 5);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" aria-label="Notificações">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b border-border flex items-center justify-between">
          <span className="font-display text-lg">Notificações</span>
          {unread > 0 && <span className="text-xs text-muted-foreground">{unread} não lida(s)</span>}
        </div>
        <div className="max-h-80 overflow-auto divide-y divide-border">
          {latest.length === 0 && <p className="p-4 text-sm text-muted-foreground text-center">Nenhuma notificação.</p>}
          {latest.map((n) => (
            <button
              key={n.id}
              onClick={() => { markRead(n.id); navigate("/admin/notificacoes"); }}
              className="w-full text-left p-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                <span className="text-sm font-medium truncate">{n.title}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("pt-BR")}</p>
            </button>
          ))}
        </div>
        <div className="p-2 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate("/admin/notificacoes")}>
            Ver todas
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
