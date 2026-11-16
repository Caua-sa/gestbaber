import { describe, expect, it } from "vitest";
import { getAppointmentWhatsAppLink } from "@/lib/appointmentWhatsApp";

const appointment = { phone: "(11) 99999-1234", clientName: "Ana", shopName: "Barbearia", service: "Corte + Barba", barber: "Pedro", date: "2026-11-16", time: "14:30", status: "confirmado" };

describe("Aviso de agendamento no WhatsApp", () => {
  it("abre a conversa com número brasileiro e detalhes do agendamento", () => {
    const link = getAppointmentWhatsAppLink(appointment, false);
    expect(link?.startsWith("https://web.whatsapp.com/send?phone=5511999991234&text=")).toBe(true);
    const text = new URL(link || "https://invalid.local").searchParams.get("text");
    expect(text).toContain("Corte + Barba");
    expect(text).toContain("16/11/2026");
    expect(text).toContain("14:30");
    expect(text).toContain("Pedro");
  });
  it("não abre uma conversa sem telefone válido", () => {
    expect(getAppointmentWhatsAppLink({ ...appointment, phone: "" })).toBeNull();
  });
  it("abre o WhatsApp no celular com o mesmo número", () => {
    expect(getAppointmentWhatsAppLink(appointment, true)?.startsWith("https://wa.me/5511999991234?text=")).toBe(true);
  });
  it("não informa confirmação para um agendamento cancelado", () => {
    const link = getAppointmentWhatsAppLink({ ...appointment, status: "cancelado" });
    expect(decodeURIComponent(link || "")).toContain("está cancelado");
  });
});