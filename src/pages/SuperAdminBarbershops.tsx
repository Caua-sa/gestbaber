import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, Ban, CheckCircle2, Trash2, KeyRound, Mail, Search, Crown, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Shop {
  id: string; name: string; slug: string; owner_id: string;
  active: boolean; banned: boolean; phone: string | null; created_at: string;
  owner_email: string | null; owner_last_sign_in: string | null;
}

export default function SuperAdminBarbershops() {
  const { user, loading: authLoading } = useAuth();
  const [isSuper, setIsSuper] = useState<boolean | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [dialog, setDialog] = useState<null | { kind: "password" | "email"; shop: Shop }>(null);
  const [dialogValue, setDialogValue] = useState("");
  const [promoteEmail, setPromoteEmail] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setIsSuper(false); return; }
    (async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "superadmin").maybeSingle();
      setIsSuper(!!data);
    })();
  }, [user, authLoading]);

  const call = async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke("superadmin-manage", { body, headers: { Authorization: `Bearer ${session?.access_token}` } });
    if (res.error) throw new Error(res.error.message);
    if ((res.data as any)?.error) throw new Error((res.data as any).error);
    return res.data;
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await call({ action: "list_barbershops" });
      setShops(data.shops || []);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  useEffect(() => { if (isSuper) load(); }, [isSuper]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return shops;
    return shops.filter((x) => (x.name || "").toLowerCase().includes(s) || (x.slug || "").toLowerCase().includes(s) || (x.owner_email || "").toLowerCase().includes(s));
  }, [shops, q]);

  const doAction = async (action: string, body: any, ok: string) => {
    try { await call({ action, ...body }); toast.success(ok); load(); } catch (e: any) { toast.error(e.message); }
  };

  if (authLoading || isSuper === null) return <div className="min-h-screen flex items-center justify-center text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verificando…</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-card border border-border rounded-xl p-6 text-center space-y-3">
          <Shield className="h-8 w-8 text-primary mx-auto" />
          <h1 className="font-display text-2xl">Painel Superadmin</h1>
          <p className="text-sm text-muted-foreground">Faça login para acessar.</p>
          <a href="/admin/login" className="inline-block underline text-primary text-sm">Ir para login</a>
        </div>
      </div>
    );
  }

  if (!isSuper) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-6 text-center space-y-3">
          <Shield className="h-8 w-8 text-destructive mx-auto" />
          <h1 className="font-display text-2xl text-destructive">Acesso restrito</h1>
          <p className="text-sm text-muted-foreground">
            Este painel é exclusivo do dono do aplicativo (papel <code>superadmin</code>).
          </p>
          <p className="text-xs text-muted-foreground">
            Para conceder acesso pela primeira vez, rode no banco:<br />
            <code className="text-primary text-[11px]">INSERT INTO user_roles (user_id, role) VALUES ('SEU_USER_ID', 'superadmin');</code>
          </p>
        </div>
      </div>
    );
  }

  const promote = async () => {
    if (!promoteEmail) return;
    try { await call({ action: "promote_superadmin", email: promoteEmail }); toast.success("Promovido a superadmin"); setPromoteEmail(""); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-6 max-w-7xl mx-auto">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl gold-text flex items-center gap-2"><Crown className="h-8 w-8" /> Painel Superadmin</h1>
          <p className="text-muted-foreground text-sm mt-1">Controle total de todas as barbearias do aplicativo.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} className="gap-1"><RefreshCw className="h-3 w-3" /> Atualizar</Button>
          <a href="/dashboard" className="text-sm underline text-muted-foreground">Sair do painel</a>
        </div>
      </header>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="font-display text-lg">Promover novo superadmin</p>
        <div className="flex gap-2">
          <Input placeholder="email@exemplo.com" value={promoteEmail} onChange={(e) => setPromoteEmail(e.target.value)} />
          <Button onClick={promote}>Promover</Button>
        </div>
        <p className="text-xs text-muted-foreground">O usuário já deve ter cadastro em /admin/signup.</p>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, slug ou e-mail…" className="border-0 focus-visible:ring-0 shadow-none px-0" />
          <Badge variant="outline">{filtered.length} barbearia(s)</Badge>
        </div>

        {loading ? (
          <div className="p-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Carregando…</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barbearia</TableHead>
                <TableHead>Dono</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último login</TableHead>
                <TableHead className="w-56 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">/{s.slug} • criado {new Date(s.created_at).toLocaleDateString("pt-BR")}</div>
                  </TableCell>
                  <TableCell className="text-sm">{s.owner_email || "—"}</TableCell>
                  <TableCell>
                    {s.banned ? <Badge className="bg-destructive text-destructive-foreground">Banida</Badge>
                      : s.active ? <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Ativa</Badge>
                      : <Badge variant="outline">Inativa</Badge>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.owner_last_sign_in ? new Date(s.owner_last_sign_in).toLocaleString("pt-BR") : "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 flex-wrap">
                      <Button size="sm" variant="outline" className="gap-1" title={s.banned ? "Liberar" : "Banir"}
                        onClick={() => doAction("set_banned", { barbershop_id: s.id, banned: !s.banned }, s.banned ? "Liberada" : "Banida")}>
                        {s.banned ? <><CheckCircle2 className="h-3 w-3" /> Liberar</> : <><Ban className="h-3 w-3" /> Banir</>}
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1"
                        onClick={() => doAction("set_active", { barbershop_id: s.id, active: !s.active }, "Atualizado")}>
                        {s.active ? "Desativar" : "Ativar"}
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1"
                        onClick={() => { setDialog({ kind: "password", shop: s }); setDialogValue(""); }}>
                        <KeyRound className="h-3 w-3" /> Senha
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1"
                        onClick={() => { setDialog({ kind: "email", shop: s }); setDialogValue(s.owner_email || ""); }}>
                        <Mail className="h-3 w-3" /> E-mail
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1"
                        onClick={() => confirm(`Bloquear login do dono de ${s.name}?`) && doAction("ban_owner_login", { user_id: s.owner_id, ban: true }, "Login bloqueado")}>
                        Bloq. login
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1"
                        onClick={() => doAction("ban_owner_login", { user_id: s.owner_id, ban: false }, "Login liberado")}>
                        Lib. login
                      </Button>
                      <Button size="sm" variant="destructive" className="gap-1"
                        onClick={() => confirm(`Apagar DEFINITIVAMENTE a barbearia ${s.name}?`) && doAction("delete_barbershop", { barbershop_id: s.id }, "Apagada")}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nada encontrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={!!dialog} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialog?.kind === "password" ? "Definir nova senha" : "Alterar e-mail do dono"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Barbearia: <b>{dialog?.shop.name}</b></p>
            <div>
              <Label>{dialog?.kind === "password" ? "Nova senha (mín 6)" : "Novo e-mail"}</Label>
              <Input type={dialog?.kind === "password" ? "text" : "email"} value={dialogValue} onChange={(e) => setDialogValue(e.target.value)} />
            </div>
            <Button className="w-full" onClick={async () => {
              if (!dialog) return;
              try {
                if (dialog.kind === "password") await call({ action: "reset_password", user_id: dialog.shop.owner_id, password: dialogValue });
                else await call({ action: "set_owner_email", user_id: dialog.shop.owner_id, email: dialogValue });
                toast.success("Atualizado"); setDialog(null); load();
              } catch (e: any) { toast.error(e.message); }
            }}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
