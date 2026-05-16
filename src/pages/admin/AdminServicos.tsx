import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Loader2, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  price: number;
  duration_min: number;
  active: boolean;
}

export default function AdminServicos() {
  const { user } = useAuth();
  const [list, setList] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState({ name: "", price: 0, duration_min: 30, active: true });
  const [shopId, setShopId] = useState<string | null>(null);

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    const { data: shop } = await supabase.from("barbershops").select("id").eq("owner_id", user.id).maybeSingle();
    setShopId(shop?.id || null);
    const { data } = await supabase.from("services").select("*").eq("owner_id", user.id).order("name");
    setList(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [user]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", price: 0, duration_min: 30, active: true });
    setOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({ name: s.name, price: Number(s.price), duration_min: s.duration_min, active: s.active });
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const payload = { ...form, owner_id: user.id, barbershop_id: shopId };
    const { error } = editing
      ? await supabase.from("services").update(payload).eq("id", editing.id)
      : await supabase.from("services").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Serviço atualizado" : "Serviço criado");
    setOpen(false);
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este serviço?")) return;
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido");
    fetchAll();
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-display gold-text">Cortes & Preços</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie os serviços que aparecem para clientes e no agendamento</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gold-gradient text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" /> Novo Corte
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl gold-text">
                {editing ? "Editar Corte" : "Novo Corte"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 mt-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome *</label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Ex.: Corte degradê" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Preço (R$) *</label>
                  <Input type="number" min={0} step="0.01" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} required />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Duração (min)</label>
                  <Input type="number" min={5} step={5} value={form.duration_min} onChange={e => setForm({ ...form, duration_min: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.active} onCheckedChange={v => setForm({ ...form, active: v })} />
                <span className="text-sm">Ativo (visível para clientes)</span>
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
          <p className="text-muted-foreground">Nenhum corte cadastrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {list.map(s => (
            <div key={s.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Scissors className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{s.name}</p>
                <p className="text-xs text-muted-foreground">{fmt(Number(s.price))} · {s.duration_min} min {!s.active && "· Inativo"}</p>
              </div>
              <button onClick={() => openEdit(s)} className="p-2 text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => handleDelete(s.id)} className="p-2 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
