import { useEffect, useState } from "react";
import { Puzzle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAccountOwner } from "@/hooks/useAccountOwner";
import { toast } from "sonner";

export default function AdminExtensao() {
  const owner = useAccountOwner() as any;
  const ownerId: string | undefined = owner?.ownerId ?? owner;
  const [shop, setShop] = useState<{ id: string; slug: string; name: string } | null>(null);

  useEffect(() => {
    if (!ownerId || typeof ownerId !== "string") return;
    supabase.from("barbershops").select("id,slug,name").eq("owner_id", ownerId).maybeSingle().then(({ data }) => setShop(data as any));
  }, [ownerId]);

  const fields = [
    { label: "Barbearia", value: shop?.name || "" },
    { label: "ID da barbearia", value: shop?.id || "" },
    { label: "Slug", value: shop?.slug || "" },
    { label: "Endereço do backend", value: import.meta.env.VITE_SUPABASE_URL },
    { label: "Chave pública", value: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Puzzle className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-3xl font-display">Extensão</h1>
          <p className="text-sm text-muted-foreground">Dados para conectar sua extensão ao sistema</p>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        {fields.map(f => (
          <div key={f.label} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">{f.label}</p>
              <p className="text-sm font-mono truncate">{f.value || "—"}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(f.value || ""); toast.success("Copiado"); }}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Cole esses dados na sua extensão. A extensão deve fazer login com a conta do painel para acessar os agendamentos.</p>
    </div>
  );
}
