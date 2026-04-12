import { useState } from "react";
import { motion } from "framer-motion";
import { Package, AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { Progress } from "@/components/ui/progress";

const initialProducts = [
  { id: 1, name: "Pomada Modeladora", category: "Finalização", stock: 24, min: 10, price: "R$ 35", sold: 45 },
  { id: 2, name: "Shampoo Anticaspa", category: "Higiene", stock: 8, min: 10, price: "R$ 28", sold: 32 },
  { id: 3, name: "Óleo para Barba", category: "Barba", stock: 15, min: 5, price: "R$ 42", sold: 28 },
  { id: 4, name: "Cera Capilar", category: "Finalização", stock: 3, min: 10, price: "R$ 30", sold: 52 },
  { id: 5, name: "Lâminas Descartáveis", category: "Descartáveis", stock: 120, min: 50, price: "R$ 0,80", sold: 200 },
  { id: 6, name: "Loção Pós-Barba", category: "Barba", stock: 18, min: 5, price: "R$ 38", sold: 20 },
  { id: 7, name: "Gel Fixador", category: "Finalização", stock: 6, min: 10, price: "R$ 22", sold: 38 },
  { id: 8, name: "Talco", category: "Acessórios", stock: 30, min: 10, price: "R$ 15", sold: 15 },
];

export default function Estoque() {
  const [products] = useState(initialProducts);
  const lowStock = products.filter((p) => p.stock <= p.min).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display gold-text">Estoque</h1>
          <p className="text-muted-foreground text-sm mt-1">Controle de produtos e insumos</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar Produto
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total de Produtos" value={String(products.length)} icon={Package} index={0} />
        <StatCard title="Estoque Baixo" value={String(lowStock)} icon={AlertTriangle} index={1} />
        <StatCard title="Valor em Estoque" value="R$ 4.280" icon={Package} index={2} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((p, i) => {
          const stockPercent = Math.min((p.stock / (p.min * 3)) * 100, 100);
          const isLow = p.stock <= p.min;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-card border rounded-lg p-4 ${isLow ? "border-destructive/50" : "border-border"}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.category}</p>
                </div>
                {isLow && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estoque</span>
                  <span className={`font-medium ${isLow ? "text-destructive" : ""}`}>{p.stock} un</span>
                </div>
                <Progress value={stockPercent} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Mínimo: {p.min}</span>
                  <span>Vendidos: {p.sold}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
