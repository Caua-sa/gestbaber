import { describe, expect, it } from "vitest";
import { getBookingCombo, toggleBookingService } from "@/lib/bookingCombo";

const services = [
  { id: "corte", name: "Corte", price: 35 },
  { id: "barba", name: "Barba", price: 20 },
];

describe("Combos de agendamento", () => {
  it("combina corte e barba em um único agendamento", () => {
    expect(getBookingCombo(services, ["corte", "barba"])).toEqual({
      services, serviceIds: ["corte", "barba"], name: "Corte + Barba", price: 55,
    });
  });
  it("permite retirar um serviço do combo", () => {
    expect(toggleBookingService(["corte", "barba"], "barba")).toEqual(["corte"]);
  });
  it("não cobra duas vezes o mesmo serviço", () => {
    expect(getBookingCombo(services, ["corte", "corte"]).price).toBe(35);
  });
  it("não considera serviços inexistentes", () => {
    expect(getBookingCombo(services, ["apagado"]).serviceIds).toEqual([]);
  });
});