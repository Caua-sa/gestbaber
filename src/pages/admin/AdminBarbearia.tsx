import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Store, Upload, Loader2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function AdminBarbearia() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [shop, setShop] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("barbershops")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();
      setShop(data || { owner_id: user.id, name: "", slug: "", active: true });
      setLoading(false);
    })();
  }, [user]);

  const slugify = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);

  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("barbershop-logos")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("barbershop-logos").getPublicUrl(path);
      setShop({ ...shop, logo_url: data.publicUrl });
      toast.success("Logo enviada! Clique em Salvar para confirmar.");
    } catch (e: any) {
      toast.error(e.message || "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !shop) return;
    if (!shop.name?.trim()) return toast.error("Nome obrigatório");
    setSaving(true);
    const payload = {
      owner_id: user.id,
      name: shop.name.trim(),
      slug: shop.slug?.trim() || slugify(shop.name),
      description: shop.description || null,
      phone: shop.phone || null,
      address: shop.address || null,
      logo_url: shop.logo_url || null,
      active: true,
    };
    const { error } = shop.id
      ? await supabase.from("barbershops").update(payload).eq("id", shop.id)
      : await supabase.from("barbershops").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Barbearia salva!");
    const { data } = await supabase.from("barbershops").select("*").eq("owner_id", user.id).maybeSingle();
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
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />
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
            <Input value={shop?.address || ""} onChange={(e) => setShop({ ...shop, address: e.target.value })} className="bg-secondary border-border mt-1" />
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição</Label>
            <Textarea value={shop?.description || ""} onChange={(e) => setShop({ ...shop, description: e.target.value })} rows={3} className="bg-secondary border-border mt-1" />
          </div>
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
