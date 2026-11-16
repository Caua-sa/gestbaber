interface AppointmentMessage {
  phone: string;
  clientName: string;
  shopName: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  status: string;
}

export function getAppointmentWhatsAppLink(appointment: AppointmentMessage, mobile = /Android|iPhone|iPad|iPod/i.test(globalThis.navigator?.userAgent ?? "")) {
  let phone = appointment.phone.replace(/\D/g, "");
  if (phone.length === 10 || phone.length === 11) phone = `55${phone}`;
  if (!/^\d{12,15}$/.test(phone)) return null;
  const date = appointment.date.split("-").reverse().join("/");
  const status = appointment.status === "cancelado" ? "cancelado" : appointment.status === "pendente" ? "pendente de confirmação" : appointment.status === "concluido" ? "concluído" : "confirmado";
  const text = `Olá, ${appointment.clientName}! Seu agendamento na ${appointment.shopName} está ${status}.\n\nServiço: ${appointment.service}\nBarbeiro: ${appointment.barber}\nData: ${date}\nHorário: ${appointment.time.slice(0, 5)}`;
  return mobile
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
}