import { describe, expect, it } from "vitest";

import { bookingTotals, depositFor } from "./deposit";

describe("seña", () => {
  it("es el 40% del precio", () => {
    expect(depositFor(15000)).toBe(6000);
  });

  it("redondea al peso más cercano", () => {
    expect(depositFor(15001)).toBe(6000);
    expect(depositFor(15002)).toBe(6001);
  });
});

describe("totales de la reserva", () => {
  it("un servicio usa su precio y bloques", () => {
    expect(bookingTotals([{ price: 15000, blocks: 1 }])).toEqual({
      price: 15000,
      blocks: 1,
      deposit: 6000,
    });
  });

  it("un combo suma precio y bloques", () => {
    expect(
      bookingTotals([
        { price: 15000, blocks: 1 },
        { price: 15000, blocks: 1 },
      ]),
    ).toEqual({ price: 30000, blocks: 2, deposit: 12000 });
  });

  it("rechaza una reserva sin servicios", () => {
    expect(() => bookingTotals([])).toThrow();
  });
});
