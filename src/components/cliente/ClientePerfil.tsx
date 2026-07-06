import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { User, Mail, Phone, Cake, Loader2 } from "lucide-react";

export function ClientePerfil() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [full_name, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setFullName(data.full_name || "");
        setEmail(data.email || user.email || "");
        setPhone(data.phone || "");
        setBirthday(data.birthday ? String(data.birthday).slice(0, 10) : "");
      } else {
        setEmail(user.email || "");
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    if (!full_name.trim()) { toast.error("Informe seu nome"); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id,
      full_name: full_name.trim(),
      email: email.trim() || null,
      phone: phone.replace(/\D/g, "") || null,
      birthday: birthday || null,
    }, { onConflict: "user_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Perfil atualizado!");
  };

  if (loading) return <div className="flex justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="max-w-md mx-auto bg-card border border-border rounded-lg p-6 space-y-4">
      <div>
        <h2 className="font-display text-xl tracking-wide">Meus Dados</h2>
        <p className="text-xs text-muted-foreground">Mantenha suas informações sempre atualizadas.</p>
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><User className="h-3 w-3" /> Nome</label>
        <Input value={full_name} onChange={(e) => setFullName(e.target.value)} className="bg-secondary border-border" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Mail className="h-3 w-3" /> E-mail</label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-secondary border-border" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Phone className="h-3 w-3" /> WhatsApp</label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" className="bg-secondary border-border" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Cake className="h-3 w-3" /> Aniversário (ganhe cupom no seu dia 🎂)</label>
        <Input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className="bg-secondary border-border" />
      </div>
      <Button onClick={save} disabled={saving} className="w-full gold-gradient text-primary-foreground">
        {saving ? "Salvando..." : "Salvar alterações"}
      </Button>
    </div>
  );
}
