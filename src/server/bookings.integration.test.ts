import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { toInstant } from "@/lib/booking/time";

import {
  createManualBooking,
  createOnlineBooking,
  expireOverdueBookings,
  getAvailableStarts,
} from "./bookings";
import { prisma } from "./db";

const runId = crypto.randomUUID().slice(0, 8);
const date = "2030-03-12";
const now = toInstant("2030-03-10", 10 * 60);
const hours = (value: number) => value * 60;
const at = (minutes: number) => toInstant(date, minutes);

let barberId: string;
let singleServiceId: string;
let secondServiceId: string;
const userIds: string[] = [];

async function createUser(label: string) {
  const id = `${runId}-${label}`;
  await prisma.user.create({
    data: {
      id,
      name: label,
      email: `${id}@barberia.test`,
      phone: "1155550000",
    },
  });
  userIds.push(id);
  return id;
}

beforeAll(async () => {
  const userId = await createUser("barbero");
  const barber = await prisma.barber.create({
    data: {
      userId,
      displayName: "Barbero de prueba",
      services: {
        create: [
          { name: "Corte", price: 15000, blocks: 1 },
          { name: "Barba", price: 15000, blocks: 1 },
        ],
      },
      workPeriods: {
        create: [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) => [
          { weekday, startMinutes: hours(10), endMinutes: hours(12) },
          { weekday, startMinutes: hours(13), endMinutes: hours(22) },
        ]),
      },
    },
    include: { services: { orderBy: { name: "desc" } } },
  });

  barberId = barber.id;
  singleServiceId = barber.services[0]!.id;
  secondServiceId = barber.services[1]!.id;
});

afterAll(async () => {
  await prisma.booking.deleteMany({ where: { barberId } });
  await prisma.barber.delete({ where: { id: barberId } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe("reservas concurrentes", () => {
  it("solo una de 20 reservas simultáneas gana el mismo horario", async () => {
    const clients = await Promise.all(
      Array.from({ length: 20 }, (_, index) => createUser(`mismo-${index}`)),
    );

    const results = await Promise.all(
      clients.map((clientId) =>
        createOnlineBooking({
          barberId,
          clientId,
          serviceIds: [singleServiceId],
          start: at(hours(13)),
          method: "MERCADO_PAGO",
          now,
        }),
      ),
    );

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(
      results.filter((r) => !r.ok && r.error === "SLOT_UNAVAILABLE"),
    ).toHaveLength(19);
    expect(
      await prisma.bookingSlot.count({
        where: { barberId, startsAt: at(hours(13)) },
      }),
    ).toBe(1);
  });

  it("dos combos solapados no pueden entrar a la vez", async () => {
    const [first, second] = await Promise.all([
      createUser("combo-a"),
      createUser("combo-b"),
    ]);
    const serviceIds = [singleServiceId, secondServiceId];

    const results = await Promise.all([
      createOnlineBooking({
        barberId,
        clientId: first,
        serviceIds,
        start: at(hours(15.25)),
        method: "MERCADO_PAGO",
        now,
      }),
      createOnlineBooking({
        barberId,
        clientId: second,
        serviceIds,
        start: at(hours(16)),
        method: "MERCADO_PAGO",
        now,
      }),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
  });

  it("un cliente no supera 2 turnos aunque reserve en paralelo", async () => {
    const clientId = await createUser("limite");
    const starts = [17.5, 18.25, 19, 19.75].map((value) => at(hours(value)));

    const results = await Promise.all(
      starts.map((start) =>
        createOnlineBooking({
          barberId,
          clientId,
          serviceIds: [singleServiceId],
          start,
          method: "MERCADO_PAGO",
          now,
        }),
      ),
    );

    expect(results.filter((result) => result.ok)).toHaveLength(2);
    expect(
      results.filter((r) => !r.ok && r.error === "TOO_MANY_BOOKINGS"),
    ).toHaveLength(2);
  });
});

describe("vencimiento de turnos", () => {
  it("un turno sin pagar deja de ocupar el horario al vencer", async () => {
    const [first, second] = await Promise.all([
      createUser("vence-a"),
      createUser("vence-b"),
    ]);
    const start = toInstant("2030-03-13", hours(13));
    const today = "2030-03-13";

    const held = await createOnlineBooking({
      barberId,
      clientId: first,
      serviceIds: [singleServiceId],
      start,
      method: "MERCADO_PAGO",
      now,
    });
    expect(held.ok).toBe(true);
    expect(
      (await getAvailableStarts(barberId, today, 1, now)).map(Number),
    ).not.toContain(start.getTime());

    const later = new Date(now.getTime() + 31 * 60_000);
    expect(
      (await getAvailableStarts(barberId, today, 1, later)).map(Number),
    ).toContain(start.getTime());

    const retaken = await createOnlineBooking({
      barberId,
      clientId: second,
      serviceIds: [singleServiceId],
      start,
      method: "MERCADO_PAGO",
      now: later,
    });

    expect(retaken.ok).toBe(true);
    if (held.ok) {
      const old = await prisma.booking.findUniqueOrThrow({
        where: { id: held.bookingId },
      });
      expect(old.status).toBe("EXPIRED");
    }
  });

  it("el trabajo programado vence y libera los pendientes", async () => {
    const clientId = await createUser("trabajo");
    const start = toInstant("2030-03-14", hours(13));
    const held = await createOnlineBooking({
      barberId,
      clientId,
      serviceIds: [singleServiceId],
      start,
      method: "MERCADO_PAGO",
      now,
    });
    expect(held.ok).toBe(true);

    const expired = await expireOverdueBookings(
      new Date(now.getTime() + 31 * 60_000),
    );

    expect(expired).toBeGreaterThanOrEqual(1);
    expect(
      await prisma.bookingSlot.count({ where: { barberId, startsAt: start } }),
    ).toBe(0);
  });
});

describe("validaciones de la reserva", () => {
  it("rechaza un horario fuera de la agenda del barbero", async () => {
    const clientId = await createUser("fuera");

    expect(
      await createOnlineBooking({
        barberId,
        clientId,
        serviceIds: [singleServiceId],
        start: toInstant("2030-03-18", hours(13)),
        method: "MERCADO_PAGO",
        now: toInstant("2030-03-10", hours(10)),
      }),
    ).toEqual({ ok: false, error: "TOO_FAR" });

    expect(
      await createOnlineBooking({
        barberId,
        clientId,
        serviceIds: [singleServiceId],
        start: toInstant("2030-03-11", hours(12) + 15),
        method: "MERCADO_PAGO",
        now,
      }),
    ).toEqual({ ok: false, error: "SLOT_UNAVAILABLE" });
  });

  it("rechaza efectivo a menos de 3 horas del turno", async () => {
    const clientId = await createUser("efectivo");

    expect(
      await createOnlineBooking({
        barberId,
        clientId,
        serviceIds: [singleServiceId],
        start: toInstant("2030-03-10", hours(13)),
        method: "CASH",
        now: toInstant("2030-03-10", hours(10) + 30),
      }),
    ).toEqual({ ok: false, error: "CASH_UNAVAILABLE" });
  });

  it("un turno manual queda confirmado sin seña obligatoria", async () => {
    const result = await createManualBooking({
      barberId,
      clientName: "Cliente del local",
      clientPhone: "1155550001",
      serviceIds: [singleServiceId],
      start: toInstant("2030-03-16", hours(13)),
      depositPaid: false,
      now,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const booking = await prisma.booking.findUniqueOrThrow({
        where: { id: result.bookingId },
      });
      expect(booking.status).toBe("CONFIRMED");
      expect(booking.depositStatus).toBe("NOT_REQUIRED");
    }
  });
});
