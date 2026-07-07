import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccountOwner } from "@/hooks/useAccountOwner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, Tv, ExternalLink, Image as ImageIcon, Video, Youtube } from "lucide-react";
import { toast } from "sonner";

interface Media {
  id: string;
  title: string | null;
  media_type: "image" | "video" | "youtube";
  media_url: string;
  link_url: string | null;
  duration_seconds: number | null;
  sort_order: number | null;
  active: boolean;
}

const empty = { title: "", media_type: "image" as Media["media_type"], media_url: "", link_url: "", duration_seconds: 8, sort_order: 0, active: true };

export default function AdminMarketing() {
  const { ownerId, isOwner, loading: ol } = useAccountOwner();
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopSlug, setShopSlug] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Media | null>(null);
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    if (!ownerId) return;
    setLoading(true);
    const [{ data }, { data: shop }] = await Promise.all([
      supabase.from("marketing_media").select("*").eq("owner_id", ownerId).order("sort_order"),
      supabase.from("barbershops").select("slug").eq("owner_id", ownerId).maybeSingle(),
    ]);
    setItems((data || []) as any);
    setShopSlug((shop as any)?.slug || null);
    setLoading(false);
  };

  useEffect(() => { if (!ol && ownerId) load(); }, [ol, ownerId]);

  const openNew = () => { setEditing(null); setForm({ ...empty }); setOpen(true); };
  const openEdit = (m: Media) => {
    setEditing(m);
    setForm({
      title: m.title || "",
      media_type: m.media_type,
      media_url: m.media_url,
      link_url: m.link_url || "",
      duration_seconds: m.duration_seconds || 8,
      sort_order: m.sort_order || 0,
      active: m.active,
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerId) return;
    setSaving(true);
    const payload = { ...form, owner_id: ownerId, link_url: form.link_url || null, title: form.title || null };
    const { error } = editing
      ? await supabase.from("marketing_media").update(payload).eq("id", editing.id)
      : await supabase.from("marketing_media").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Atualizado" : "Adicionado");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este item?")) return;
    const { error } = await supabase.from("marketing_media").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido");
    load();
  };

  const toggleActive = async (m: Media) => {
    await supabase.from("marketing_media").update({ active: !m.active }).eq("id", m.id);
    load();
  };

  const uploadFile = async (file: File) => {
    if (!ownerId) return;
    const ext = file.name.split(".").pop();
    const path = `${ownerId}/marketing/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("barbershop-logos").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("barbershop-logos").getPublicUrl(path);
    setForm((f) => ({ ...f, media_url: data.publicUrl }));
    toast.success("Upload feito");
  };

  if (ol || loading) return <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…</div>;
  if (!isOwner) return <p className="text-destructive font-display text-xl">Acesso restrito ao dono da barbearia.</p>;

  const tvUrl = shopSlug ? `${window.location.origin}/tv/${shopSlug}` : null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-4xl font-display gold-text flex items-center gap-2"><Tv className="h-7 w-7" /> Marketing TV</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Fotos, vídeos e propagandas que passam ao lado da agenda na TV/Tablet.
          </p>
          {tvUrl && (
            <a href={tvUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary text-sm mt-2">
              <ExternalLink className="h-3 w-3" /> Abrir tela TV
            </a>
          )}
        </div>
        <Button onClick={openNew} className="gold-gradient text-primary-foreground gap-2"><Plus className="h-4 w-4" /> Adicionar mídia</Button>
      </div>

      {items.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center text-muted-foreground text-sm">
          Nenhuma mídia ainda. Adicione uma foto, vídeo ou link do YouTube para começar.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((m) => (
            <div key={m.id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
              <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
                {m.media_type === "image" && <img src={m.media_url} alt={m.title || ""} className="w-full h-full object-cover" />}
                {m.media_type === "video" && <video src={m.media_url} muted className="w-full h-full object-cover" />}
                {m.media_type === "youtube" && <Youtube className="h-12 w-12 text-primary" />}
              </div>
              <div className="p-3 flex flex-col gap-1 flex-1">
                <div className="flex items-center gap-2">
                  {m.media_type === "image" && <ImageIcon className="h-3 w-3 text-muted-foreground" />}
                  {m.media_type === "video" && <Video className="h-3 w-3 text-muted-foreground" />}
                  {m.media_type === "youtube" && <Youtube className="h-3 w-3 text-muted-foreground" />}
                  <p className="font-medium text-sm truncate flex-1">{m.title || "Sem título"}</p>
                </div>
                {m.link_url && <a href={m.link_url} target="_blank" rel="noreferrer" className="text-xs text-primary truncate">{m.link_url}</a>}
                <div className="flex items-center gap-2 pt-2 mt-auto">
                  <Switch checked={m.active} onCheckedChange={() => toggleActive(m)} />
                  <span className="text-xs text-muted-foreground flex-1">{m.active ? "Ativo" : "Pausado"}</span>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display text-xl">{editing ? "Editar mídia" : "Nova mídia"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3 mt-2">
            <div>
              <Label>Título (opcional)</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.media_type} onValueChange={(v) => setForm({ ...form, media_type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Imagem</SelectItem>
                  <SelectItem value="video">Vídeo (upload)</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{form.media_type === "youtube" ? "URL do YouTube" : "URL da mídia"}</Label>
              <Input value={form.media_url} onChange={(e) => setForm({ ...form, media_url: e.target.value })} placeholder={form.media_type === "youtube" ? "https://youtu.be/…" : "https://…"} required />
              {form.media_type !== "youtube" && (
                <Input type="file" accept={form.media_type === "image" ? "image/*" : "video/*"} className="mt-2"
                  onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
              )}
            </div>
            <div>
              <Label>Link ao clicar (opcional — abre em nova aba)</Label>
              <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://fornecedor.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Duração (seg)</Label>
                <Input type="number" min={3} max={120} value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Ordem</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <span className="text-sm">Ativo na TV</span>
            </div>
            <Button type="submit" className="w-full gold-gradient text-primary-foreground" disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando…</> : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
