import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, Trash2, Shield, Loader2 } from "lucide-react";

interface AdminUser {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

export default function AdminUsuarios() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");

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

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await callFn({ action: "list" });
      setUsers(data.users || []);
    } catch (err: any) {
      toast.error("Erro ao carregar: " + err.message);
    }
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      // Sempre criamos um "user" (cliente) vinculado à barbearia atual.
      // Nunca criamos outro admin/barbearia paralela.
      await callFn({
        action: "create",
        email: newEmail,
        password: newPassword,
        full_name: newName,
        role: "user",
      });
      toast.success("Cliente cadastrado com sucesso!");
      setOpen(false);
      setNewEmail(""); setNewPassword(""); setNewName("");
      loadUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
    setCreating(false);
  };

  const handleDelete = async (user_id: string, email: string) => {
    if (!confirm(`Remover ${email}? Esta ação é irreversível.`)) return;
    try {
      await callFn({ action: "delete", user_id });
      toast.success("Removido.");
      loadUsers();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display gold-text">Clientes da Barbearia</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Crie contas de clientes vinculadas à sua barbearia. Nenhuma nova barbearia é criada.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gold-gradient text-primary-foreground">
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Cadastrar Cliente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Nome completo</label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">E-mail</label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Senha</label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
              </div>
              <p className="text-xs text-muted-foreground">
                O cliente acessará via <span className="text-primary">/cliente/login</span> e poderá agendar e assinar planos desta barbearia.
              </p>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : "Cadastrar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum cliente cadastrado por você ainda.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        <Shield className="h-3 w-3" />
                        {u.role === "admin" ? "Administrador" : "Cliente"}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(u.user_id, u.email)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
