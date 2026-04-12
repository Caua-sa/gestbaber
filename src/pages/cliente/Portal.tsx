import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, Calendar, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ClientePlanos } from "@/components/cliente/ClientePlanos";
import { ClienteAgendamento } from "@/components/cliente/ClienteAgendamento";
import { ClienteMeusAgendamentos } from "@/components/cliente/ClienteMeusAgendamentos";

type Tab = "planos" | "agendar" | "meus-agendamentos";

export default function ClientePortal() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("planos");

  const tabs = [
    { id: "planos" as Tab, label: "Planos", icon: Crown },
    { id: "agendar" as Tab, label: "Agendar", icon: Calendar },
    { id: "meus-agendamentos" as Tab, label: "Meus Agendamentos", icon: User },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-display gold-text tracking-wider">BARBER PRO</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map((t) => (
            <Button
              key={t.id}
              variant={tab === t.id ? "default" : "outline"}
              onClick={() => setTab(t.id)}
              className="gap-2 shrink-0"
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </Button>
          ))}
        </div>

        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {tab === "planos" && <ClientePlanos />}
          {tab === "agendar" && <ClienteAgendamento />}
          {tab === "meus-agendamentos" && <ClienteMeusAgendamentos />}
        </motion.div>
      </div>
    </div>
  );
}
