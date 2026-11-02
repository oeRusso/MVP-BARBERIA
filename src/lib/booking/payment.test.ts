import { describe, expect, it } from "vitest";

import {
  barberCancellationOutcome,
  clientCancellationOutcome,
  isCashAvailable,
  paymentDeadline,
} from "./payment";

const HOUR_MS = 3_600_000;
const now = new Date("2026-11-09T13:00:00.000Z");
const hoursFromNow = (hours: number) =>
  new Date(now.getTime() + hours * HOUR_MS);

describe("efectivo", () => {
  it("está disponible para turnos a 3 horas o más", () => {
    expect(isCashAvailable(hoursFromNow(3), now)).toBe(true);
  });

  it("no está disponible para turnos a menos de 3 horas", () => {
    expect(isCashAvailable(hoursFromNow(2.9), now)).toBe(false);
  });
});

describe("plazo de pago", () => {
  it("Mercado Pago tiene 30 minutos", () => {
    expect(paymentDeadline("MERCADO_PAGO", now, hoursFromNow(48))).toEqual(
      new Date(now.getTime() + 30 * 60_000),
    );
  });

  it("efectivo tiene 24 horas en un turno lejano", () => {
    expect(paymentDeadline("CASH", now, hoursFromNow(72))).toEqual(
      hoursFromNow(24),
    );
  });

  it("efectivo vence 2 horas antes en un turno cercano", () => {
    expect(paymentDeadline("CASH", now, hoursFromNow(5))).toEqual(
      hoursFromNow(3),
    );
  });
});

describe("cancelación del cliente", () => {
  it("sin seña pagada no tiene penalidad", () => {
    expect(clientCancellationOutcome(false, hoursFromNow(1), now)).toBe(
      "NOTHING_PAID",
    );
  });

  it("a tiempo decide el barbero", () => {
    expect(clientCancellationOutcome(true, hoursFromNow(24), now)).toBe(
      "BARBER_DECIDES",
    );
  });

  it("tarde pierde la seña", () => {
    expect(clientCancellationOutcome(true, hoursFromNow(23), now)).toBe(
      "FORFEITED",
    );
  });
});

describe("cancelación del barbero", () => {
  it("siempre devuelve una seña pagada", () => {
    expect(barberCancellationOutcome(true)).toBe("REFUND_DUE");
  });

  it("no hay nada que devolver sin seña pagada", () => {
    expect(barberCancellationOutcome(false)).toBe("NOTHING_PAID");
  });
});
