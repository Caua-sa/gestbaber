import { Check, Plus, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookingService, getBookingCombo, toggleBookingService } from "@/lib/bookingCombo";

interface Props {
  services: BookingService[];
  value: string[];
  onChange: (value: string[]) => void;
}

const currency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function BookingServicePicker({ services, value, onChange }: Props) {
  const combo = getBookingCombo(services, value);
  return (
    <div className="space-y-3">
      <div className="grid gap-2 max-h-60 overflow-y-auto">
        {services.length === 0 && <p className="text-sm text-muted-foreground">Nenhum serviço cadastrado.</p>}
        {services.map(service => {
          const selected = value.includes(service.id);
          return (
            <Button key={service.id} type="button" variant="outline" aria-pressed={selected}
              onClick={() => onChange(toggleBookingService(value, service.id))}
              className={cn("h-auto min-h-12 w-full justify-between whitespace-normal text-left px-3 py-3", selected && "border-primary bg-primary/10 text-foreground")}>
              <span className="flex min-w-0 items-center gap-2"><Scissors className="text-primary" /><span className="break-words">{service.name}</span></span>
              <span className="flex shrink-0 items-center gap-2 text-primary">{currency(service.price)}{selected ? <Check /> : <Plus />}</span>
            </Button>
          );
        })}
      </div>
      {combo.services.length > 0 && <div className="flex items-start justify-between gap-3 border-t border-border pt-3 text-sm">
        <span className="min-w-0 break-words">{combo.name}</span>
        <strong className="shrink-0 text-primary">{currency(combo.price)}</strong>
      </div>}
    </div>
  );
}