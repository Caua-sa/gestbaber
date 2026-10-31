import { useEffect, useState } from "react";
import { Construction } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountOwner } from "@/hooks/useAccountOwner";
import { Comandas } from "@/components/estoque/Comandas";
import Vendas from "@/pages/Vendas";
import Estoque from "@/pages/Estoque";
import AdminInsumos from "@/pages/admin/AdminInsumos";
import AdminBarbeiros from "@/pages/admin/AdminBarbeiros";
import AdminGanhosBarbeiros from "@/pages/admin/AdminGanhosBarbeiros";

function Hub({ initial, tabs }: { initial: string; tabs: { value: string; label: string; node: React.ReactNode }[] }) {
  const [tab, setTab] = useState(initial);
  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-6">
      <TabsList>
        {tabs.map(t => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
      </TabsList>
      {tabs.map(t => <TabsContent key={t.value} value={t.value} className="mt-0">{t.node}</TabsContent>)}
    </Tabs>
  );
}

function ComandasTab() {
  const { user } = useAuth();
  const { ownerId } = useAccountOwner();
  const [products, setProducts] = useState<any[]>([]);
  const load = async () => {
    if (!ownerId) return;
    const { data } = await supabase.from("products").select("*").eq("owner_id", ownerId).eq("active", true).gt("stock", 0).order("name");
    setProducts(data || []);
  };
  useEffect(() => { load(); }, [ownerId]);
  if (!user || !ownerId) return null;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-display gold-text">Comandas</h1>
        <p className="text-muted-foreground text-sm mt-1">Consumo dos clientes durante o atendimento</p>
      </div>
      <Comandas ownerId={ownerId} userId={user.id} products={products} onChange={load} />
      <div className="bg-card border border-dashed border-primary/40 rounded-lg p-4 flex items-center gap-3">
        <Construction className="h-6 w-6 text-primary" />
        <div>
          <p className="font-medium">Controle de mesa de sinuca</p>
          <p className="text-xs text-muted-foreground">Em construção — em breve você poderá controlar tempo e valor das mesas.</p>
        </div>
      </div>
    </div>
  );
}

export function VendasHub({ initial = "pdv" }: { initial?: string }) {
  return <Hub initial={initial} tabs={[
    { value: "pdv", label: "PDV", node: <Vendas /> },
    { value: "comandas", label: "Comandas", node: <ComandasTab /> },
  ]} />;
}

export function EstoqueHub({ initial = "estoque" }: { initial?: string }) {
  return <Hub initial={initial} tabs={[
    { value: "estoque", label: "Estoque", node: <Estoque /> },
    { value: "insumos", label: "Insumos", node: <AdminInsumos /> },
  ]} />;
}

export function BarbeirosHub({ initial = "equipe" }: { initial?: string }) {
  return <Hub initial={initial} tabs={[
    { value: "equipe", label: "Barbeiros", node: <AdminBarbeiros /> },
    { value: "ganhos", label: "Ganhos", node: <AdminGanhosBarbeiros /> },
  ]} />;
}
