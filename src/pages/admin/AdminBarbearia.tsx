import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Store, Upload, Loader2, Link as LinkIcon, Instagram, Facebook, MessageCircle, MapPin, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountOwner } from "@/hooks/useAccountOwner";
import { toast } from "sonner";

export default function AdminBarbearia() {
  const { user } = useAuth();
  const { ownerId } = useAccountOwner();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [shop, setShop] = useState<any>(null);

  useEffect(() => {
    if (!user || !ownerId) return;
    (async () => {
      const { data } = await supabase
        .from("barbershops")
        .select("*")
        .eq("owner_id", ownerId)
        .maybeSingle();
      setShop(data || { owner_id: ownerId, name: "", slug: "", active: true, photos: [] });
      setLoading(false);
    })();
  }, [user, ownerId]);

  const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);

  const uploadToBucket = async (file: File, prefix: string) => {
    const ext = file.name.split(".").pop();
    const path = `${user!.id}/${prefix}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("barbershop-logos")
      .upload(path, file, { upsert: true });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from("barbershop-logos").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleLogoUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const url = await uploadToBucket(file, "logo");
      setShop({ ...shop, logo_url: url });
      toast.success("Logo enviada! Clique em Salvar para confirmar.");
    } catch (e: any) {
      toast.error(e.message || "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!user) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadToBucket(file, "photo");
      const photos = [...(shop.photos || []), url];
      setShop({ ...shop, photos });
      toast.success("Foto adicionada! Clique em Salvar para confirmar.");
    } catch (e: any) {
      toast.error(e.message || "Erro no upload");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (idx: number) => {
    const photos = (shop.photos || []).filter((_: any, i: number) => i !== idx);
    setShop({ ...shop, photos });
  };

  const handleSave = async () => {
    if (!user || !ownerId || !shop) return;
    if (!shop.name?.trim()) return toast.error("Nome obrigatório");
    setSaving(true);
    const payload = {
      owner_id: ownerId,
      name: shop.name.trim(),
      slug: shop.slug?.trim() || slugify(shop.name),
      description: shop.description || null,
      phone: shop.phone || null,
      address: shop.address || null,
      logo_url: shop.logo_url || null,
      instagram: shop.instagram || null,
      facebook: shop.facebook || null,
      whatsapp: shop.whatsapp || null,
      map_embed_url: shop.map_embed_url || null,
      photos: shop.photos || [],
      active: true,
    };
    const { error } = shop.id
      ? await supabase.from("barbershops").update(payload).eq("id", shop.id)
      : await supabase.from("barbershops").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Barbearia salva!");
    const { data } = await supabase.from("barbershops").select("*").eq("owner_id", ownerId).maybeSingle();
    if (data) setShop(data);
  };

  if (loading) return <div className="text-muted-foreground">Carregando...</div>;

  const publicUrl = shop?.slug ? `${window.location.origin}/site/${shop.slug}` : "";

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-4xl font-display gold-text">Minha Barbearia</h1>
        <p className="text-muted-foreground text-sm mt-1">Identidade pública do seu negócio</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-lg p-6 space-y-5"
      >
        <div className="flex items-center gap-5">
          <div className="h-24 w-24 rounded-lg bg-secondary border border-border flex items-center justify-center overflow-hidden shrink-0">
            {shop?.logo_url ? (
              <img src={shop.logo_url} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <Store className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <Label className="text-sm">Logomarca</Label>
            <p className="text-xs text-muted-foreground mb-2">PNG, JPG ou WEBP — quadrada de preferência</p>
            <label className="inline-flex">
              <Button type="button" variant="outline" disabled={uploading} asChild>
                <span className="cursor-pointer">
                  {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Enviar logo
                </span>
              </Button>
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />
            </label>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Nome da barbearia</Label>
            <Input value={shop?.name || ""} onChange={(e) => setShop({ ...shop, name: e.target.value })} className="bg-secondary border-border mt-1" />
          </div>
          <div>
            <Label>Slug (URL pública)</Label>
            <Input
              value={shop?.slug || ""}
              onChange={(e) => setShop({ ...shop, slug: slugify(e.target.value) })}
              placeholder="minha-barbearia"
              className="bg-secondary border-border mt-1"
            />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={shop?.phone || ""} onChange={(e) => setShop({ ...shop, phone: e.target.value })} className="bg-secondary border-border mt-1" />
          </div>
          <div>
            <Label>Endereço</Label>
            <Input value={shop?.address || ""} onChange={(e) => setShop({ ...shop, address: e.target.value })} placeholder="Rua, número, cidade" className="bg-secondary border-border mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição</Label>
            <Textarea value={shop?.description || ""} onChange={(e) => setShop({ ...shop, description: e.target.value })} rows={3} className="bg-secondary border-border mt-1" />
          </div>
        </div>

        {/* Redes sociais */}
        <div className="border-t border-border pt-5">
          <h3 className="font-display text-lg gold-text mb-3 tracking-wide">Redes sociais</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label className="flex items-center gap-1.5 text-xs"><Instagram className="h-3.5 w-3.5" /> Instagram</Label>
              <Input value={shop?.instagram || ""} onChange={(e) => setShop({ ...shop, instagram: e.target.value })} placeholder="@suabarbearia ou URL" className="bg-secondary border-border mt-1" />
            </div>
            <div>
              <Label className="flex items-center gap-1.5 text-xs"><Facebook className="h-3.5 w-3.5" /> Facebook</Label>
              <Input value={shop?.facebook || ""} onChange={(e) => setShop({ ...shop, facebook: e.target.value })} placeholder="URL" className="bg-secondary border-border mt-1" />
            </div>
            <div>
              <Label className="flex items-center gap-1.5 text-xs"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</Label>
              <Input value={shop?.whatsapp || ""} onChange={(e) => setShop({ ...shop, whatsapp: e.target.value })} placeholder="55119..." className="bg-secondary border-border mt-1" />
            </div>
          </div>
        </div>

        {/* Mapa */}
        <div className="border-t border-border pt-5">
          <h3 className="font-display text-lg gold-text mb-3 tracking-wide flex items-center gap-2"><MapPin className="h-4 w-4" /> Mapa do local</h3>
          <Label className="text-xs text-muted-foreground">
            Cole a URL de incorporação do Google Maps (opcional — se vazio, usamos o endereço acima).
          </Label>
          <Input value={shop?.map_embed_url || ""} onChange={(e) => setShop({ ...shop, map_embed_url: e.target.value })} placeholder="https://www.google.com/maps/embed?pb=..." className="bg-secondary border-border mt-1" />
        </div>

        {/* Galeria de fotos */}
        <div className="border-t border-border pt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg gold-text tracking-wide flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Galeria de fotos</h3>
            <label className="inline-flex">
              <Button type="button" variant="outline" size="sm" disabled={uploadingPhoto} asChild>
                <span className="cursor-pointer">
                  {uploadingPhoto ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-2" />}
                  Adicionar foto
                </span>
              </Button>
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
            </label>
          </div>
          {(shop?.photos || []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma foto adicionada ainda.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(shop.photos || []).map((url: string, i: number) => (
                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                  <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 bg-destructive/90 text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {publicUrl && (
          <div className="flex items-center gap-2 text-sm bg-secondary/50 border border-border rounded-md px-3 py-2">
            <LinkIcon className="h-4 w-4 text-primary" />
            <a href={publicUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">{publicUrl}</a>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gold-gradient text-primary-foreground">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : "Salvar alterações"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
