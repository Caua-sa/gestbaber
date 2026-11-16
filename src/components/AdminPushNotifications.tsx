import { useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { enableAdminPush, pushMessages } from "@/lib/adminPush";
import { toast } from "sonner";

export function AdminPushNotifications() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return <Dialog><DialogTrigger asChild><Button variant="ghost" size="icon" title="Notificações de agendamentos" aria-label="Notificações de agendamentos"><BellRing className="h-4 w-4" /></Button></DialogTrigger>
    <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Novos agendamentos</DialogTitle></DialogHeader>
      <Button disabled={busy} onClick={async () => {
        setBusy(true);
        try { setMessage(pushMessages[await enableAdminPush((title) => toast.info(title))]); }
        catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível ativar notificações."); }
        finally { setBusy(false); }
      }}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}Ativar neste aparelho</Button>
      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    </DialogContent></Dialog>;
}