import { useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const timeSlots = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"];

const initialAppointments = [
  { id: 1, client: "Carlos Silva", service: "Corte + Barba", barber: "João", time: "09:00", status: "confirmado" },
  { id: 2, client: "Pedro Santos", service: "Corte Degradê", barber: "Lucas", time: "10:00", status: "confirmado" },
  { id: 3, client: "Rafael Lima", service: "Barba", barber: "João", time: "11:00", status: "pendente" },
  { id: 4, client: "André Costa", service: "Combo", barber: "Lucas", time: "14:00", status: "confirmado" },
  { id: 5, client: "Marcos Oliveira", service: "Corte Social", barber: "João", time: "15:30", status: "pendente" },
];

export default function Agendamento() {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [open, setOpen] = useState(false);

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const newApp = {
      id: Date.now(),
      client: form.get("client") as string,
      service: form.get("service") as string,
      barber: form.get("barber") as string,
      time: form.get("time") as string,
      status: "pendente",
    };
    setAppointments((prev) => [...prev, newApp].sort((a, b) => a.time.localeCompare(b.time)));
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display gold-text">Agendamento</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie os horários do dia</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Novo Agendamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <Input name="client" placeholder="Nome do cliente" required className="bg-secondary border-border" />
              <Select name="service" required>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Serviço" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Corte">Corte</SelectItem>
                  <SelectItem value="Barba">Barba</SelectItem>
                  <SelectItem value="Corte + Barba">Corte + Barba</SelectItem>
                  <SelectItem value="Corte Degradê">Corte Degradê</SelectItem>
                  <SelectItem value="Combo Completo">Combo Completo</SelectItem>
                </SelectContent>
              </Select>
              <Select name="barber" required>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Barbeiro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="João">João</SelectItem>
                  <SelectItem value="Lucas">Lucas</SelectItem>
                </SelectContent>
              </Select>
              <Select name="time" required>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Horário" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="submit" className="w-full">Agendar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {appointments.map((app, i) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-lg p-4 flex items-center justify-between hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">{app.client}</p>
                <p className="text-sm text-muted-foreground">{app.service} • {app.barber}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-lg font-display tracking-wide">{app.time}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                app.status === "confirmado"
                  ? "bg-success/10 text-success"
                  : "bg-warning/10 text-warning"
              }`}>
                {app.status}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
