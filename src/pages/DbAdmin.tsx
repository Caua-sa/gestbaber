import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PasswordGate } from "@/components/PasswordGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Database, RefreshCw, Save, Trash2, Search } from "lucide-react";

const TABLES = [
  "barbershops", "barbers", "services", "appointments", "profiles",
  "subscriptions", "plans", "transactions", "orders", "products",
  "insumos", "user_roles", "whatsapp_settings", "marketing_media",
  "landing_page_settings", "mp_settings", "mp_payments", "mp_subscriptions",
];

function DbAdminInner() {
  const [table, setTable] = useState<string>("barbershops");
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<{ id: string; field: string; value: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).from(table).select("*").limit(200);
    setLoading(false);
    if (error) { toast.error(error.message); setRows([]); return; }
    setRows(data || []);
  };

  useEffect(() => { load(); }, [table]);

  const columns = useMemo(() => (rows[0] ? Object.keys(rows[0]) : []), [rows]);
  const filtered = useMemo(() => {
    if (!filter.trim()) return rows;
    const q = filter.toLowerCase();
    return rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
  }, [rows, filter]);

  const saveEdit = async () => {
    if (!editing) return;
    try {
      let v: any = editing.value;
      if (v === "null") v = null;
      else if (v === "true") v = true;
      else if (v === "false") v = false;
      else if (/^-?\d+(\.\d+)?$/.test(v)) v = Number(v);
      const { error } = await (supabase as any).from(table).update({ [editing.field]: v }).eq("id", editing.id);
      if (error) throw error;
      toast.success("Salvo");
      setEditing(null);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const deleteRow = async (id: string) => {
    if (!confirm(`Excluir linha ${id}?`)) return;
    const { error } = await (supabase as any).from(table).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Excluído");
    load();
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-[1400px] mx-auto space-y-4">
        <header className="flex items-center gap-3 flex-wrap">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <h1 className="font-display text-3xl gold-text tracking-wide">Banco de Dados</h1>
          <span className="text-xs text-muted-foreground">Consulte e edite qualquer tabela do sistema.</span>
          <div className="ml-auto flex gap-2">
            <Select value={table} onValueChange={setTable}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>{TABLES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </header>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filtrar linhas..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-10" />
        </div>

        <div className="border border-border rounded-lg overflow-auto max-h-[70vh]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                {columns.map(c => <TableHead key={c} className="text-xs whitespace-nowrap">{c}</TableHead>)}
                <TableHead className="text-xs w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r, i) => (
                <TableRow key={r.id || i}>
                  {columns.map(c => (
                    <TableCell
                      key={c}
                      className="text-xs max-w-xs truncate cursor-pointer hover:bg-muted/50"
                      onClick={() => c !== "id" && setEditing({ id: r.id, field: c, value: r[c] === null ? "null" : String(r[c] ?? "") })}
                      title="Clique para editar"
                    >
                      {r[c] === null ? <span className="text-muted-foreground italic">null</span> : String(r[c]).slice(0, 80)}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => deleteRow(r.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={columns.length + 1} className="text-center text-muted-foreground py-6">Sem dados</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {editing && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setEditing(null)}>
            <div className="bg-card border border-border rounded-lg p-5 w-full max-w-md space-y-3" onClick={e => e.stopPropagation()}>
              <p className="text-xs text-muted-foreground">
                <span className="font-mono">{table}.{editing.field}</span> — id: <span className="font-mono">{editing.id.slice(0, 8)}</span>
              </p>
              <textarea
                autoFocus
                value={editing.value}
                onChange={e => setEditing({ ...editing, value: e.target.value })}
                className="w-full h-32 rounded-md bg-secondary border border-border p-2 text-sm font-mono"
              />
              <p className="text-[10px] text-muted-foreground">Use <code>null</code>, <code>true</code>, <code>false</code> ou números literais para tipar automaticamente.</p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
                <Button onClick={saveEdit}><Save className="h-3.5 w-3.5 mr-1" /> Salvar</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DbAdmin() {
  return (
    <PasswordGate password="233004" storageKey="dbadmin-unlocked" title="Banco de Dados" subtitle="Área técnica — acesso restrito">
      <DbAdminInner />
    </PasswordGate>
  );
}
