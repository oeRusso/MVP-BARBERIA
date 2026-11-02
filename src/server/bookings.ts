import {
  availableStarts,
  bookingBlocks,
  type BusyInterval,
  checkBookingWindow,
  freeStarts,
} from "@/lib/booking/availability";
import { bookingTotals } from "@/lib/booking/deposit";
import { isCashAvailable, paymentDeadline } from "@/lib/booking/payment";
import { BLOCK_MINUTES, MAX_ACTIVE_BOOKINGS } from "@/lib/booking/rules";
import {
  addDays,
  type LocalDate,
  toInstant,
  toLocal,
  weekdayOf,
} from "@/lib/booking/time";

import { prisma } from "./db";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
type Db = typeof prisma | Tx;

export type BookingError =
  | "NO_SERVICES"
  | "TOO_SOON"
  | "TOO_FAR"
  | "CASH_UNAVAILABLE"
  | "TOO_MANY_BOOKINGS"
  | "SLOT_UNAVAILABLE";

export type BookingResult =
  | { ok: true; bookingId: string }
  | { ok: false; error: BookingError };

class BookingFailure extends Error {
  constructor(readonly reason: BookingError) {
    super(reason);
  }
}

const MAX_TRANSACTION_ATTEMPTS = 4;
const TRANSACTION_OPTIONS = { maxWait: 15_000, timeout: 15_000 };

function errorCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : undefined;
}

/** Corre una reserva y traduce los conflictos de la base a un error de negocio. */
async function runBooking(
  work: (tx: Tx) => Promise<string>,
): Promise<BookingResult> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const bookingId = await prisma.$transaction(work, TRANSACTION_OPTIONS);
      return { ok: true, bookingId };
    } catch (error) {
      if (error instanceof BookingFailure) {
        return { ok: false, error: error.reason };
      }

      const code = errorCode(error);
      if (code === "P2002") {
        return { ok: false, error: "SLOT_UNAVAILABLE" };
      }
      // MySQL resuelve un interbloqueo cancelando una transacción: se reintenta.
      if (code === "P2034" && attempt < MAX_TRANSACTION_ATTEMPTS) {
        continue;
      }
      throw error;
    }
  }
}

function overdue(now: Date) {
  return { status: "PENDING_DEPOSIT", paymentDeadline: { lte: now } } as const;
}

async function loadBusy(
  db: Db,
  barberId: string,
  date: LocalDate,
  now: Date,
): Promise<BusyInterval[]> {
  const dayStart = toInstant(date, 0);
  const dayEnd = toInstant(addDays(date, 1), 0);

  const [slots, timeOff] = await Promise.all([
    db.bookingSlot.findMany({
      where: {
        barberId,
        startsAt: { gte: dayStart, lt: dayEnd },
        NOT: { booking: overdue(now) },
      },
      select: { startsAt: true },
    }),
    db.timeOff.findMany({
      where: { barberId, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  return [
    ...slots.map(({ startsAt }) => ({
      start: startsAt,
      end: new Date(startsAt.getTime() + BLOCK_MINUTES * 60_000),
    })),
    ...timeOff.map(({ startsAt, endsAt }) => ({
      start: startsAt,
      end: endsAt,
    })),
  ];
}

async function loadPeriods(db: Db, barberId: string, date: LocalDate) {
  const periods = await db.workPeriod.findMany({
    where: { barberId, weekday: weekdayOf(date) },
    orderBy: { startMinutes: "asc" },
  });
  return periods.map(({ startMinutes, endMinutes }) => ({
    start: startMinutes,
    end: endMinutes,
  }));
}

export async function getAvailableStarts(
  barberId: string,
  date: LocalDate,
  blocks: number,
  now: Date,
): Promise<Date[]> {
  const [periods, busy] = await Promise.all([
    loadPeriods(prisma, barberId, date),
    loadBusy(prisma, barberId, date, now),
  ]);
  return availableStarts({ date, periods, blocks, busy, now });
}

async function loadServices(barberId: string, serviceIds: string[]) {
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds }, barberId, active: true },
  });
  return services.length === new Set(serviceIds).size && services.length > 0
    ? services
    : null;
}

/** Libera los bloques de reservas vencidas que ocupan los horarios pedidos. */
async function releaseOverdueSlots(
  tx: Tx,
  barberId: string,
  blocks: Date[],
  now: Date,
) {
  const stale = await tx.bookingSlot.findMany({
    where: {
      barberId,
      startsAt: { in: blocks },
      booking: overdue(now),
    },
    select: { bookingId: true },
  });
  if (stale.length === 0) {
    return;
  }

  const bookingIds = [...new Set(stale.map(({ bookingId }) => bookingId))];
  await tx.booking.updateMany({
    where: { id: { in: bookingIds } },
    data: { status: "EXPIRED" },
  });
  await tx.bookingSlot.deleteMany({ where: { bookingId: { in: bookingIds } } });
}

/** Revisa la agenda y ocupa los bloques; el índice único decide si dos compiten. */
async function occupySlots(
  tx: Tx,
  barberId: string,
  bookingId: string,
  blocks: Date[],
) {
  await tx.bookingSlot.createMany({
    data: blocks.map((startsAt) => ({ barberId, bookingId, startsAt })),
  });
}

async function assertFree(
  tx: Tx,
  barberId: string,
  start: Date,
  blocks: number,
  now: Date,
) {
  const date = toLocal(start).date;
  const [periods, busy] = await Promise.all([
    loadPeriods(tx, barberId, date),
    loadBusy(tx, barberId, date, now),
  ]);

  const free = freeStarts({ date, periods, blocks, busy });
  if (!free.some((candidate) => candidate.getTime() === start.getTime())) {
    throw new BookingFailure("SLOT_UNAVAILABLE");
  }
}

type OnlineBookingInput = {
  barberId: string;
  clientId: string;
  serviceIds: string[];
  start: Date;
  method: "MERCADO_PAGO" | "CASH";
  now: Date;
};

export async function createOnlineBooking({
  barberId,
  clientId,
  serviceIds,
  start,
  method,
  now,
}: OnlineBookingInput): Promise<BookingResult> {
  const windowError = checkBookingWindow(start, now);
  if (windowError) {
    return { ok: false, error: windowError };
  }
  if (method === "CASH" && !isCashAvailable(start, now)) {
    return { ok: false, error: "CASH_UNAVAILABLE" };
  }

  const services = await loadServices(barberId, serviceIds);
  if (!services) {
    return { ok: false, error: "NO_SERVICES" };
  }
  const totals = bookingTotals(services);
  const blocks = bookingBlocks(start, totals.blocks);

  return runBooking(async (tx) => {
    // Serializa las reservas de un mismo cliente para respetar el límite.
    const [client] = await tx.$queryRaw<{ name: string; phone: string | null }[]>`
      SELECT name, phone FROM User WHERE id = ${clientId} FOR UPDATE`;
    if (!client?.phone) {
      throw new Error("El cliente necesita un teléfono para reservar");
    }

    const active = await tx.booking.count({
      where: {
        clientId,
        OR: [
          { status: "PENDING_DEPOSIT", paymentDeadline: { gt: now } },
          { status: "CONFIRMED", startsAt: { gt: now } },
        ],
      },
    });
    if (active >= MAX_ACTIVE_BOOKINGS) {
      throw new BookingFailure("TOO_MANY_BOOKINGS");
    }

    await releaseOverdueSlots(tx, barberId, blocks, now);
    await assertFree(tx, barberId, start, totals.blocks, now);

    const booking = await tx.booking.create({
      data: {
        barberId,
        clientId,
        clientName: client.name,
        clientPhone: client.phone,
        startsAt: start,
        blocks: totals.blocks,
        price: totals.price,
        deposit: totals.deposit,
        status: "PENDING_DEPOSIT",
        depositStatus: "PENDING",
        paymentMethod: method,
        paymentDeadline: paymentDeadline(method, now, start),
        source: "ONLINE",
        items: {
          create: services.map(({ id, name, price, blocks }) => ({
            serviceId: id,
            name,
            price,
            blocks,
          })),
        },
      },
    });
    await occupySlots(tx, barberId, booking.id, blocks);

    return booking.id;
  });
}

type ManualBookingInput = {
  barberId: string;
  clientName: string;
  clientPhone: string;
  serviceIds: string[];
  start: Date;
  depositPaid: boolean;
  now: Date;
};

/** Turno cargado por el barbero: queda confirmado y la seña es opcional. */
export async function createManualBooking({
  barberId,
  clientName,
  clientPhone,
  serviceIds,
  start,
  depositPaid,
  now,
}: ManualBookingInput): Promise<BookingResult> {
  const services = await loadServices(barberId, serviceIds);
  if (!services) {
    return { ok: false, error: "NO_SERVICES" };
  }
  const totals = bookingTotals(services);
  const blocks = bookingBlocks(start, totals.blocks);

  return runBooking(async (tx) => {
    await releaseOverdueSlots(tx, barberId, blocks, now);
    await assertFree(tx, barberId, start, totals.blocks, now);

    const booking = await tx.booking.create({
      data: {
        barberId,
        clientName,
        clientPhone,
        startsAt: start,
        blocks: totals.blocks,
        price: totals.price,
        deposit: totals.deposit,
        status: "CONFIRMED",
        depositStatus: depositPaid ? "PAID" : "NOT_REQUIRED",
        paymentMethod: depositPaid ? "CASH" : null,
        source: "MANUAL",
        items: {
          create: services.map(({ id, name, price, blocks }) => ({
            serviceId: id,
            name,
            price,
            blocks,
          })),
        },
      },
    });
    await occupySlots(tx, barberId, booking.id, blocks);

    return booking.id;
  });
}

/**
 * Mueve un turno a otro horario conservando la seña. Solo lo usa el personal,
 * y también sirve para recuperar a un cliente que no se presentó.
 */
export async function rescheduleBooking(
  bookingId: string,
  start: Date,
  now: Date,
): Promise<BookingResult> {
  return runBooking(async (tx) => {
    await tx.$queryRaw`SELECT id FROM Booking WHERE id = ${bookingId} FOR UPDATE`;
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking || !["CONFIRMED", "NO_SHOW"].includes(booking.status)) {
      throw new BookingFailure("SLOT_UNAVAILABLE");
    }

    const blocks = bookingBlocks(start, booking.blocks);
    await tx.bookingSlot.deleteMany({ where: { bookingId } });
    await releaseOverdueSlots(tx, booking.barberId, blocks, now);
    await assertFree(tx, booking.barberId, start, booking.blocks, now);
    await occupySlots(tx, booking.barberId, bookingId, blocks);

    await tx.booking.update({
      where: { id: bookingId },
      data: {
        startsAt: start,
        status: "CONFIRMED",
        depositStatus:
          booking.depositStatus === "RETAINED" ? "PAID" : booking.depositStatus,
      },
    });
    return bookingId;
  });
}

/** Vence los turnos sin seña cuyo plazo terminó y libera sus bloques. */
export async function expireOverdueBookings(now: Date): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const bookings = await tx.booking.findMany({
      where: overdue(now),
      select: { id: true },
    });
    const ids = bookings.map(({ id }) => id);
    if (ids.length === 0) {
      return 0;
    }

    await tx.booking.updateMany({
      where: { id: { in: ids }, ...overdue(now) },
      data: { status: "EXPIRED" },
    });
    await tx.bookingSlot.deleteMany({ where: { bookingId: { in: ids } } });
    return ids.length;
  }, TRANSACTION_OPTIONS);
}
