import {
  barberCancellationOutcome,
  type CancellationOutcome,
  clientCancellationOutcome,
} from "@/lib/booking/payment";

import type { DepositStatus } from "@/generated/prisma/client";

import { prisma } from "./db";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export type StatusError = "NOT_FOUND" | "INVALID_STATE" | "TOO_LATE";
export type StatusResult = { ok: true } | { ok: false; error: StatusError };

const OPEN_STATUSES = ["PENDING_DEPOSIT", "CONFIRMED"] as const;

async function lockBooking(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT id FROM Booking WHERE id = ${id} FOR UPDATE`;
  return tx.booking.findUnique({ where: { id } });
}

function depositAfter(
  outcome: CancellationOutcome,
  current: DepositStatus,
): DepositStatus {
  switch (outcome) {
    case "FORFEITED":
      return "RETAINED";
    case "REFUND_DUE":
      return "REFUND_DUE";
    case "BARBER_DECIDES":
      return "PAID";
    case "NOTHING_PAID":
      return current === "PENDING" ? "NOT_REQUIRED" : current;
  }
}

async function cancel(
  tx: Tx,
  id: string,
  cancelledBy: "CLIENT" | "STAFF",
  depositStatus: DepositStatus,
  now: Date,
) {
  await tx.booking.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledBy,
      cancelledAt: now,
      depositStatus,
    },
  });
  await tx.bookingSlot.deleteMany({ where: { bookingId: id } });
}

export async function cancelByClient(
  bookingId: string,
  clientId: string,
  now: Date,
): Promise<StatusResult> {
  return prisma.$transaction(async (tx) => {
    const booking = await lockBooking(tx, bookingId);
    if (!booking || booking.clientId !== clientId) {
      return { ok: false, error: "NOT_FOUND" };
    }
    if (!OPEN_STATUSES.some((status) => status === booking.status)) {
      return { ok: false, error: "INVALID_STATE" };
    }
    if (booking.startsAt <= now) {
      return { ok: false, error: "TOO_LATE" };
    }

    const outcome = clientCancellationOutcome(
      booking.depositStatus === "PAID",
      booking.startsAt,
      now,
    );
    await cancel(
      tx,
      bookingId,
      "CLIENT",
      depositAfter(outcome, booking.depositStatus),
      now,
    );
    return { ok: true };
  });
}

export async function cancelByStaff(
  bookingId: string,
  now: Date,
): Promise<StatusResult> {
  return prisma.$transaction(async (tx) => {
    const booking = await lockBooking(tx, bookingId);
    if (!booking) {
      return { ok: false, error: "NOT_FOUND" };
    }
    if (!OPEN_STATUSES.some((status) => status === booking.status)) {
      return { ok: false, error: "INVALID_STATE" };
    }

    const outcome = barberCancellationOutcome(booking.depositStatus === "PAID");
    await cancel(
      tx,
      bookingId,
      "STAFF",
      depositAfter(outcome, booking.depositStatus),
      now,
    );
    return { ok: true };
  });
}

/** El barbero o administrador confirma una seña recibida en efectivo. */
export async function confirmCashDeposit(
  bookingId: string,
): Promise<StatusResult> {
  const updated = await prisma.booking.updateMany({
    where: {
      id: bookingId,
      status: "PENDING_DEPOSIT",
      paymentMethod: "CASH",
    },
    data: {
      status: "CONFIRMED",
      depositStatus: "PAID",
      paymentDeadline: null,
    },
  });
  return updated.count === 1
    ? { ok: true }
    : { ok: false, error: "INVALID_STATE" };
}

/** Cierra un turno confirmado como atendido o como ausencia. */
export async function closeBooking(
  bookingId: string,
  outcome: "COMPLETED" | "NO_SHOW",
): Promise<StatusResult> {
  return prisma.$transaction(async (tx) => {
    const booking = await lockBooking(tx, bookingId);
    if (!booking) {
      return { ok: false, error: "NOT_FOUND" };
    }
    if (booking.status !== "CONFIRMED") {
      return { ok: false, error: "INVALID_STATE" };
    }

    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: outcome,
        depositStatus:
          outcome === "NO_SHOW" && booking.depositStatus === "PAID"
            ? "RETAINED"
            : booking.depositStatus,
      },
    });
    return { ok: true };
  });
}

/** Resuelve la seña de una cancelación hecha a tiempo por el cliente. */
export async function decideDeposit(
  bookingId: string,
  decision: "REFUND_DUE" | "RETAINED",
): Promise<StatusResult> {
  const updated = await prisma.booking.updateMany({
    where: {
      id: bookingId,
      status: "CANCELLED",
      cancelledBy: "CLIENT",
      depositStatus: "PAID",
    },
    data: { depositStatus: decision },
  });
  return updated.count === 1
    ? { ok: true }
    : { ok: false, error: "INVALID_STATE" };
}

/** Registra que la seña ya se devolvió a mano en Mercado Pago. */
export async function markDepositRefunded(
  bookingId: string,
): Promise<StatusResult> {
  const updated = await prisma.booking.updateMany({
    where: { id: bookingId, depositStatus: "REFUND_DUE" },
    data: { depositStatus: "REFUNDED" },
  });
  return updated.count === 1
    ? { ok: true }
    : { ok: false, error: "INVALID_STATE" };
}
