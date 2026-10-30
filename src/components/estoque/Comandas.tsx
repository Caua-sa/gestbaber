import { useEffect, useState } from "react";
import { Plus, Minus, Receipt, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Product { id: string; name: string; sell_price: number; stock: number; sold: number }
interface Item { id: string; comanda_id: string; product_id: string | null; name: string; unit_price: number; quantity: number }
interface Comanda { id: string; customer_name: string; created_at: string; appointment_id: string | null }
import { generateComandaReceiptPDF } from "@/lib/receipt";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function Comandas({ ownerId, userId, products, onChange }: { ownerId: string; userId: string; products: Product[]; onChange: () => void }) {
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState("");
  const [pick, setPick] = useState<Record<string, string>>({});

  const load = async () => {
    const { data: c } = await supabase.from("comandas").select("id, customer_name, created_at, appointment_id").eq("owner_id", ownerId).eq("status", "aberta").order("created_at");
    setComandas((c as Comanda[]) || []);
    const ids = (c || []).map((x: any) => x.id);
    if (ids.length) {
      const { data: it } = await supabase.from("comanda_items").select("*").in("comanda_id", ids);
      setItems((it as Item[]) || []);
    } else setItems([]);
  };
  useEffect(() => { load(); }, [ownerId]);

  const open = async () => {
    if (!name.trim()) return toast.error("Informe o nome do cliente");
    const { error } = await supabase.from("comandas").insert({ owner_id: ownerId, customer_name: name.trim() });
    if (error) return toast.error(error.message);
    setName(""); load();
  };

  const addItem = async (c: Comanda) => {
    const p = products.find(x => x.id === pick[c.id]);
    if (!p) return toast.error("Escolha um produto");
    const ex = items.find(i => i.comanda_id === c.id && i.product_id === p.id);
    const { error } = ex
      ? await supabase.from("comanda_items").update({ quantity: ex.quantity + 1 }).eq("id", ex.id)
      : await supabase.from("comanda_items").insert({ comanda_id: c.id, owner_id: ownerId, product_id: p.id, name: p.name, unit_price: p.sell_price, quantity: 1 });
    if (error) return toast.error(error.message);
    load();
  };

  const changeQty = async (i: Item, d: number) => {
    if (i.quantity + d <= 0) await supabase.from("comanda_items").delete().eq("id", i.id);
    else await supabase.from("comanda_items").update({ quantity: i.quantity + d }).eq("id", i.id);
    load();
  };

  const close = async (c: Comanda) => {
    const its = items.filter(i => i.comanda_id === c.id);
    const total = its.reduce((s, i) => s + i.quantity * Number(i.unit_price), 0);
    if (!confirm(`Fechar comanda de ${c.customer_name} — ${fmt(total)}?`)) return;
    for (const i of its) {
      const p = products.find(x => x.id === i.product_id);
      if (p) await supabase.from("products").update({ stock: Math.max(0, p.stock - i.quantity), sold: (p.sold || 0) + i.quantity }).eq("id", p.id);
    }
    const today = new Date().toISOString().slice(0, 10);
    const svcTotal = its.filter(i => !i.product_id).reduce((s, i) => s + i.quantity * Number(i.unit_price), 0);
    const prodTotal = total - svcTotal;
    if (svcTotal > 0) {
      const tag = c.appointment_id ? `[appt:${c.appointment_id}]` : null;
      let exists = false;
      if (tag) {
        const { data } = await supabase.from("transactions").select("id").eq("owner_id", ownerId).ilike("notes", `%${tag}%`).maybeSingle();
        exists = !!data;
      }
      if (!exists) await supabase.from("transactions").insert({
        owner_id: ownerId, created_by: userId, type: "entrada", category: "Cortes", value: svcTotal,
        description: `Comanda (serviço): ${c.customer_name}`, transaction_date: today, notes: tag,
      });
    }
    if (prodTotal > 0) {
      await supabase.from("transactions").insert({
        owner_id: ownerId, created_by: userId, type: "entrada", category: "Conveniência", value: prodTotal,
        description: `Comanda: ${c.customer_name}`, transaction_date: today,
      });
    }
    await supabase.from("comandas").update({ status: "fechada", total, closed_at: new Date().toISOString() }).eq("id", c.id);
    if (c.appointment_id) await supabase.from("appointments").update({ status: "concluido" }).eq("id", c.appointment_id);
    const { data: shop } = await supabase.from("barbershops").select("name, address, phone").eq("owner_id", ownerId).maybeSingle();
    generateComandaReceiptPDF({
      shopName: shop?.name || "Barbearia", shopAddress: shop?.address || undefined, shopPhone: shop?.phone || undefined,
      clientName: c.customer_name, receiptId: c.id, items: its,
    });
    toast.success("Comanda fechada, lançada no financeiro e cupom gerado!");
    load(); onChange();
  };

  const cancel = async (c: Comanda) => {
    if (!confirm("Cancelar esta comanda?")) return;
    await supabase.from("comandas").delete().eq("id", c.id);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" /><h2 className="font-display text-2xl">Comandas</h2></div>
      <div className="flex gap-2">
        <Input placeholder="Nome do cliente" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && open()} className="bg-secondary border-border" />
        <Button onClick={open} className="gap-1"><Plus className="h-4 w-4" /> Abrir comanda</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {comandas.map(c => {
          const its = items.filter(i => i.comanda_id === c.id);
          const total = its.reduce((s, i) => s + i.quantity * Number(i.unit_price), 0);
          return (
            <div key={c.id} className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <p className="font-medium">{c.customer_name}</p>
                <button onClick={() => cancel(c)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="flex gap-2">
                <select value={pick[c.id] || ""} onChange={e => setPick({ ...pick, [c.id]: e.target.value })} className="flex-1 bg-secondary border border-border rounded-md px-2 text-sm h-9">
                  <option value="">Adicionar produto...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} — {fmt(Number(p.sell_price))} ({p.stock})</option>)}
                </select>
                <Button size="sm" onClick={() => addItem(c)}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-1">
                {its.map(i => (
                  <div key={i.id} className="flex items-center justify-between text-sm">
                    <span>{i.name}</span>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => changeQty(i, -1)}><Minus className="h-3 w-3" /></Button>
                      <span className="w-5 text-center">{i.quantity}</span>
                      <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => changeQty(i, 1)}><Plus className="h-3 w-3" /></Button>
                      <span className="w-20 text-right">{fmt(i.quantity * Number(i.unit_price))}</span>
                    </div>
                  </div>
                ))}
                {its.length === 0 && <p className="text-xs text-muted-foreground">Nenhum item ainda.</p>}
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="font-display text-lg text-primary">{fmt(total)}</span>
                <Button size="sm" onClick={() => close(c)} className="gap-1"><CheckCircle2 className="h-4 w-4" /> Fechar</Button>
              </div>
            </div>
          );
        })}
        {comandas.length === 0 && <p className="text-sm text-muted-foreground col-span-3">Nenhuma comanda aberta.</p>}
      </div>
    </div>
  );
}
