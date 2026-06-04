import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Loader2, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountOwner } from "@/hooks/useAccountOwner";
import { toast } from "sonner";

interface Barber {
  id: string;
  name: string;
  commission_pct: number;
  active: boolean;
}

export default function AdminBarbeiros() {
  const { user } = useAuth();
  const { ownerId } = useAccountOwner();
  const [list, setList] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Barber | null>(null);
  const [form, setForm] = useState({ name: "", commission_pct: 50, active: true });
  const [shopId, setShopId] = useState<string | null>(null);

  const fetchAll = async () => {
    if (!user || !ownerId) return;
    setLoading(true);
    const { data: shop } = await supabase.from("barbershops").select("id").eq("owner_id", ownerId).maybeSingle();
    setShopId(shop?.id || null);
    const { data } = await supabase.from("barbers").select("*").eq("owner_id", ownerId).order("name");
    setList(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [user, ownerId]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", commission_pct: 50, active: true });
    setOpen(true);
  };

  const openEdit = (b: Barber) => {
    setEditing(b);
    setForm({ name: b.name, commission_pct: Number(b.commission_pct), active: b.active });
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !ownerId) return;
    setSaving(true);
    const payload = {
      name: form.name,
      commission_pct: form.commission_pct,
      active: form.active,
      owner_id: ownerId,
      barbershop_id: shopId,
    };
    const { error } = editing
      ? await supabase.from("barbers").update(payload).eq("id", editing.id)
      : await supabase.from("barbers").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Barbeiro atualizado" : "Barbeiro adicionado");
    setOpen(false);
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este barbeiro?")) return;
    const { error } = await supabase.from("barbers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido");
    fetchAll();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-display gold-text">Barbeiros</h1>
          <p className="text-muted-foreground text-sm mt-1">Cadastre os profissionais e defina a comissão por corte</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gold-gradient text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" /> Novo Barbeiro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl gold-text">
                {editing ? "Editar Barbeiro" : "Novo Barbeiro"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 mt-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome *</label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Comissão por corte (%)</label>
                <Input
                  type="number" min={0} max={100} step={1}
                  value={form.commission_pct}
                  onChange={e => setForm({ ...form, commission_pct: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} />
                <span className="text-sm">Ativo</span>
              </div>
              <Button type="submit" className="w-full gold-gradient text-primary-foreground" disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : "Salvar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : list.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
          <Scissors className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum barbeiro cadastrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map(b => (
            <div key={b.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display text-lg">
                {b.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{b.name}</p>
                <p className="text-xs text-muted-foreground">Comissão: {Number(b.commission_pct)}% {!b.active && "· Inativo"}</p>
              </div>
              <button onClick={() => openEdit(b)} className="p-2 text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => handleDelete(b.id)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
