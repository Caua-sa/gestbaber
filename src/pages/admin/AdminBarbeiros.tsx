import { useEffect, useState, useRef } from "react";
import { Plus, Trash2, Pencil, Loader2, Scissors, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountOwner } from "@/hooks/useAccountOwner";
import { toast } from "sonner";

interface Barber {
  id: string;
  name: string;
  commission_pct: number;
  active: boolean;
  photo_url: string | null;
}

export default function AdminBarbeiros() {
  const { user } = useAuth();
  const { ownerId } = useAccountOwner();
  const [list, setList] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Barber | null>(null);
  const [form, setForm] = useState({ name: "", commission_pct: 50, active: true, photo_url: "" as string | null });
  const [shopId, setShopId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setForm({ name: "", commission_pct: 50, active: true, photo_url: null });
    setOpen(true);
  };

  const openEdit = (b: Barber) => {
    setEditing(b);
    setForm({ name: b.name, commission_pct: Number(b.commission_pct), active: b.active, photo_url: b.photo_url || null });
    setOpen(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ownerId) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `barbers/${ownerId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("barbershop-logos").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Erro no upload");
      setUploading(false);
      return;
    }
    const url = supabase.storage.from("barbershop-logos").getPublicUrl(path).data.publicUrl;
    setForm(f => ({ ...f, photo_url: url }));
    setUploading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !ownerId) return;
    setSaving(true);
    const payload: any = {
      name: form.name,
      commission_pct: form.commission_pct,
      active: form.active,
      photo_url: form.photo_url || null,
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
              {/* Photo */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-16 w-16 border-2 border-border">
                    {form.photo_url ? <AvatarImage src={form.photo_url} /> : <AvatarFallback><Scissors className="h-6 w-6 text-muted-foreground" /></AvatarFallback>}
                  </Avatar>
                  {form.photo_url && (
                    <button type="button" onClick={() => setForm({ ...form, photo_url: null })} className="absolute -top-1 -right-1 bg-destructive rounded-full p-0.5 text-white">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                    {form.photo_url ? "Trocar foto" : "Adicionar foto"}
                  </Button>
                  <p className="text-[10px] text-muted-foreground mt-1">Opcional — JPG ou PNG, até 2 MB</p>
                </div>
              </div>
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
              <Avatar className="h-12 w-12 border border-border">
                {b.photo_url ? <AvatarImage src={b.photo_url} /> : (
                  <AvatarFallback className="bg-primary/10 text-primary font-display text-lg">
                    {b.name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
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
