import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLandingSettings, LandingSetting } from "@/hooks/useLandingSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save, RotateCcw } from "lucide-react";

type FieldDef = {
  section: string;
  key: string;
  label: string;
  type: "text" | "textarea";
};

const fields: FieldDef[] = [
  { section: "hero", key: "title", label: "Título Principal", type: "text" },
  { section: "hero", key: "subtitle", label: "Subtítulo", type: "text" },
  { section: "hero", key: "cta_text", label: "Texto do Botão CTA", type: "text" },
  { section: "about", key: "title", label: "Título Sobre Nós", type: "text" },
  { section: "about", key: "description", label: "Descrição Sobre Nós", type: "textarea" },
  { section: "services", key: "title", label: "Título Serviços", type: "text" },
  { section: "services", key: "service_1_name", label: "Serviço 1 - Nome", type: "text" },
  { section: "services", key: "service_1_price", label: "Serviço 1 - Preço", type: "text" },
  { section: "services", key: "service_1_desc", label: "Serviço 1 - Descrição", type: "text" },
  { section: "services", key: "service_2_name", label: "Serviço 2 - Nome", type: "text" },
  { section: "services", key: "service_2_price", label: "Serviço 2 - Preço", type: "text" },
  { section: "services", key: "service_2_desc", label: "Serviço 2 - Descrição", type: "text" },
  { section: "services", key: "service_3_name", label: "Serviço 3 - Nome", type: "text" },
  { section: "services", key: "service_3_price", label: "Serviço 3 - Preço", type: "text" },
  { section: "services", key: "service_3_desc", label: "Serviço 3 - Descrição", type: "text" },
  { section: "services", key: "service_4_name", label: "Serviço 4 - Nome", type: "text" },
  { section: "services", key: "service_4_price", label: "Serviço 4 - Preço", type: "text" },
  { section: "services", key: "service_4_desc", label: "Serviço 4 - Descrição", type: "text" },
  { section: "contact", key: "phone", label: "Telefone", type: "text" },
  { section: "contact", key: "address", label: "Endereço", type: "text" },
  { section: "contact", key: "hours", label: "Horário de Funcionamento", type: "text" },
  { section: "contact", key: "instagram", label: "Instagram", type: "text" },
  { section: "footer", key: "text", label: "Texto do Rodapé", type: "text" },
];

export default function AdminLanding() {
  const { data: settings, isLoading } = useLandingSettings();
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (settings) {
      const map: Record<string, string> = {};
      settings.forEach((s) => {
        map[`${s.section}__${s.key}`] = s.value;
      });
      setForm(map);
    }
  }, [settings]);

  const handleChange = (section: string, key: string, value: string) => {
    setForm((prev) => ({ ...prev, [`${section}__${key}`]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const field of fields) {
        const val = form[`${field.section}__${field.key}`] ?? "";
        const existing = settings?.find(
          (s) => s.section === field.section && s.key === field.key
        );
        if (existing) {
          await supabase
            .from("landing_page_settings")
            .update({ value: val })
            .eq("section", field.section)
            .eq("key", field.key);
        } else {
          await supabase
            .from("landing_page_settings")
            .insert({ section: field.section, key: field.key, value: val });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["landing-settings"] });
      toast({ title: "Salvo!", description: "Conteúdo da landing page atualizado." });
    } catch {
      toast({ title: "Erro", description: "Falha ao salvar.", variant: "destructive" });
    }
    setSaving(false);
  };

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;

  const sections = [...new Set(fields.map((f) => f.section))];
  const sectionLabels: Record<string, string> = {
    hero: "🏠 Hero",
    about: "ℹ️ Sobre Nós",
    services: "✂️ Serviços",
    contact: "📞 Contato",
    footer: "📄 Rodapé",
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display gold-text">Editar Landing Page</h1>
          <p className="text-muted-foreground text-sm mt-1">Personalize todo o conteúdo do site</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gold-gradient text-primary-foreground">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Tudo"}
        </Button>
      </div>

      {sections.map((section) => (
        <div key={section} className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-display text-xl tracking-wide">{sectionLabels[section] || section}</h2>
          {fields
            .filter((f) => f.section === section)
            .map((f) => (
              <div key={`${f.section}__${f.key}`}>
                <label className="text-sm text-muted-foreground mb-1 block">{f.label}</label>
                {f.type === "textarea" ? (
                  <Textarea
                    value={form[`${f.section}__${f.key}`] || ""}
                    onChange={(e) => handleChange(f.section, f.key, e.target.value)}
                    rows={4}
                  />
                ) : (
                  <Input
                    value={form[`${f.section}__${f.key}`] || ""}
                    onChange={(e) => handleChange(f.section, f.key, e.target.value)}
                  />
                )}
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
