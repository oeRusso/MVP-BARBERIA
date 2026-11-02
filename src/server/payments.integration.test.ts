import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { toInstant } from "@/lib/booking/time";

import { createOnlineBooking, expireOverdueBookings } from "./bookings";
import {
  cancelByClient,
  cancelByStaff,
  closeBooking,
  confirmCashDeposit,
  decideDeposit,
} from "./booking-status";
import { prisma } from "./db";
import { applyPayment } from "./payments";

const runId = crypto.randomUUID().slice(0, 8);
const now = toInstant("2030-05-10", 10 * 60);
const hours = (value: number) => value * 60;
const afterDeadline = new Date(now.getTime() + 31 * 60_000);

let barberId: string;
let serviceId: string;
let dayOffset = 0;
const userIds: string[] = [];

async function createUser(label: string) {
  const id = `${runId}-${label}-${userIds.length}`;
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

/** Cada prueba usa su propio bloque: entran 12 por día, de 13:00 a 22:00. */
function nextStart() {
  const day = 12 + Math.floor(dayOffset / 12);
  const minutes = hours(13) + (dayOffset % 12) * 45;
  dayOffset += 1;
  return toInstant(`2030-05-${day}`, minutes);
}

async function book(
  start: Date,
  method: "MERCADO_PAGO" | "CASH" = "MERCADO_PAGO",
) {
  const clientId = await createUser("cliente");
  const result = await createOnlineBooking({
    barberId,
    clientId,
    serviceIds: [serviceId],
    start,
    method,
    now,
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
  return { bookingId: result.bookingId, clientId };
}

const approved = (bookingId: string, id: string, amount = 6000) => ({
  providerPaymentId: `${runId}-${id}`,
  bookingId,
  amount,
  status: "approved",
});
const bookingById = (id: string) =>
  prisma.booking.findUniqueOrThrow({ where: { id } });

beforeAll(async () => {
  const userId = await createUser("barbero");
  const barber = await prisma.barber.create({
    data: {
      userId,
      displayName: "Barbero de pagos",
      services: { create: { name: "Corte", price: 15000, blocks: 1 } },
      workPeriods: {
        create: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
          weekday,
          startMinutes: hours(13),
          endMinutes: hours(22),
        })),
      },
    },
    include: { services: true },
  });
  barberId = barber.id;
  serviceId = barber.services[0]!.id;
});

afterAll(async () => {
  await prisma.payment.deleteMany({ where: { booking: { barberId } } });
  await prisma.booking.deleteMany({ where: { barberId } });
  await prisma.barber.delete({ where: { id: barberId } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

describe("pagos de Mercado Pago", () => {
  it("un pago aprobado confirma el turno", async () => {
    const { bookingId } = await book(nextStart());

    expect(await applyPayment(approved(bookingId, "ok"), now)).toBe(
      "CONFIRMED",
    );

    const booking = await bookingById(bookingId);
    expect(booking.status).toBe("CONFIRMED");
    expect(booking.depositStatus).toBe("PAID");
  });

  it("una notificación repetida no cambia nada", async () => {
    const { bookingId } = await book(nextStart());
    const payment = approved(bookingId, "repetido");

    await applyPayment(payment, now);

    expect(await applyPayment(payment, now)).toBe("ALREADY_PROCESSED");
    expect(await prisma.payment.count({ where: { bookingId } })).toBe(1);
  });

  it("un pago rechazado no confirma el turno", async () => {
    const { bookingId } = await book(nextStart());

    expect(
      await applyPayment(
        { ...approved(bookingId, "rechazado"), status: "rejected" },
        now,
      ),
    ).toBe("RECORDED");
    expect((await bookingById(bookingId)).status).toBe("PENDING_DEPOSIT");
  });

  it("un pago pendiente que luego se aprueba confirma el turno", async () => {
    const { bookingId } = await book(nextStart());
    const payment = approved(bookingId, "en-proceso");

    await applyPayment({ ...payment, status: "in_process" }, now);

    expect(await applyPayment(payment, now)).toBe("CONFIRMED");
    expect(await prisma.payment.count({ where: { bookingId } })).toBe(1);
  });

  it("un segundo pago del mismo turno queda para devolver", async () => {
    const { bookingId } = await book(nextStart());

    await applyPayment(approved(bookingId, "primero"), now);

    expect(await applyPayment(approved(bookingId, "segundo"), now)).toBe(
      "NEEDS_REFUND",
    );
    expect(
      await prisma.payment.count({ where: { bookingId, needsRefund: true } }),
    ).toBe(1);
    expect((await bookingById(bookingId)).depositStatus).toBe("PAID");
  });

  it("un pago menor a la seña queda para devolver", async () => {
    const { bookingId } = await book(nextStart());

    expect(await applyPayment(approved(bookingId, "poco", 100), now)).toBe(
      "NEEDS_REFUND",
    );
    expect((await bookingById(bookingId)).status).toBe("PENDING_DEPOSIT");
  });

  it("un pago tardío confirma si el horario sigue libre", async () => {
    const { bookingId } = await book(nextStart());
    await expireOverdueBookings(afterDeadline);

    expect(
      await applyPayment(approved(bookingId, "tarde-libre"), afterDeadline),
    ).toBe("CONFIRMED");
    expect(await prisma.bookingSlot.count({ where: { bookingId } })).toBe(1);
  });

  it("un pago tardío queda para devolver si el horario se ocupó", async () => {
    const start = nextStart();
    const { bookingId } = await book(start);
    await expireOverdueBookings(afterDeadline);

    const other = await createUser("otro");
    const retaken = await createOnlineBooking({
      barberId,
      clientId: other,
      serviceIds: [serviceId],
      start,
      method: "MERCADO_PAGO",
      now: afterDeadline,
    });
    expect(retaken.ok).toBe(true);

    expect(
      await applyPayment(approved(bookingId, "tarde-ocupado"), afterDeadline),
    ).toBe("NEEDS_REFUND");
    expect((await bookingById(bookingId)).status).toBe("EXPIRED");
  });

  it("un pago sobre un turno cancelado queda para devolver", async () => {
    const { bookingId, clientId } = await book(nextStart());
    await cancelByClient(bookingId, clientId, now);

    expect(await applyPayment(approved(bookingId, "cancelado"), now)).toBe(
      "NEEDS_REFUND",
    );
  });

  it("rechaza un pago de un turno desconocido", async () => {
    expect(await applyPayment(approved("no-existe", "nada"), now)).toBe(
      "UNKNOWN_BOOKING",
    );
  });
});

describe("cambios de estado", () => {
  async function paidBooking() {
    const data = await book(nextStart());
    await applyPayment(approved(data.bookingId, data.bookingId), now);
    return data;
  }

  it("cancelar un pendiente no tiene penalidad y libera el horario", async () => {
    const { bookingId, clientId } = await book(nextStart());

    expect(await cancelByClient(bookingId, clientId, now)).toEqual({
      ok: true,
    });

    const booking = await bookingById(bookingId);
    expect(booking.status).toBe("CANCELLED");
    expect(booking.depositStatus).toBe("NOT_REQUIRED");
    expect(await prisma.bookingSlot.count({ where: { bookingId } })).toBe(0);
  });

  it("un cliente no puede cancelar un turno ajeno", async () => {
    const { bookingId } = await book(nextStart());
    const stranger = await createUser("ajeno");

    expect(await cancelByClient(bookingId, stranger, now)).toEqual({
      ok: false,
      error: "NOT_FOUND",
    });
  });

  it("a tiempo con seña paga, el barbero decide", async () => {
    const { bookingId, clientId } = await paidBooking();

    await cancelByClient(bookingId, clientId, now);
    expect((await bookingById(bookingId)).depositStatus).toBe("PAID");

    expect(await decideDeposit(bookingId, "REFUND_DUE")).toEqual({ ok: true });
    expect((await bookingById(bookingId)).depositStatus).toBe("REFUND_DUE");
  });

  it("tarde con seña paga, el cliente la pierde", async () => {
    const { bookingId, clientId } = await paidBooking();
    const booking = await bookingById(bookingId);
    const lateNow = new Date(booking.startsAt.getTime() - 60 * 60_000);

    await cancelByClient(bookingId, clientId, lateNow);

    expect((await bookingById(bookingId)).depositStatus).toBe("RETAINED");
  });

  it("si cancela el barbero, la seña queda para devolver", async () => {
    const { bookingId } = await paidBooking();

    await cancelByStaff(bookingId, now);

    const booking = await bookingById(bookingId);
    expect(booking.cancelledBy).toBe("STAFF");
    expect(booking.depositStatus).toBe("REFUND_DUE");
  });

  it("una ausencia retiene la seña", async () => {
    const { bookingId } = await paidBooking();

    await closeBooking(bookingId, "NO_SHOW");

    const booking = await bookingById(bookingId);
    expect(booking.status).toBe("NO_SHOW");
    expect(booking.depositStatus).toBe("RETAINED");
  });

  it("el barbero confirma una seña en efectivo", async () => {
    const { bookingId } = await book(nextStart(), "CASH");

    expect(await confirmCashDeposit(bookingId)).toEqual({ ok: true });

    const booking = await bookingById(bookingId);
    expect(booking.status).toBe("CONFIRMED");
    expect(booking.depositStatus).toBe("PAID");
  });

  it("no confirma como efectivo un pago de Mercado Pago", async () => {
    const { bookingId } = await book(nextStart());

    expect(await confirmCashDeposit(bookingId)).toEqual({
      ok: false,
      error: "INVALID_STATE",
    });
  });
});
