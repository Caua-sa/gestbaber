export interface BookingService {
  id: string;
  name: string;
  price: number;
}

export function toggleBookingService(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter(value => value !== id) : [...ids, id];
}

export function getBookingCombo(services: BookingService[], ids: string[]) {
  const selected = [...new Set(ids)].flatMap(id => {
    const service = services.find(item => item.id === id);
    return service ? [service] : [];
  });
  return {
    services: selected,
    serviceIds: selected.map(service => service.id),
    name: selected.map(service => service.name).join(" + "),
    price: Math.round(selected.reduce((total, service) => total + Number(service.price), 0) * 100) / 100,
  };
}