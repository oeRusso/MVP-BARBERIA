import { bookingBlocks } from "@/lib/booking/availability";

import { prisma } from "./db";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export type IncomingPayment = {
  providerPaymentId: string;
  bookingId: string;
  /** Monto en pesos. */
  amount: number;
  status: string;
};

export type PaymentOutcome =
  | "CONFIRMED"
  | "RECORDED"
  | "ALREADY_PROCESSED"
  | "NEEDS_REFUND"
  | "UNKNOWN_BOOKING";

type LockedBooking = NonNullable<Awaited<ReturnType<typeof lockBooking>>>;

async function lockBooking(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT id FROM Booking WHERE id = ${id} FOR UPDATE`;
  return tx.booking.findUnique({ where: { id } });
}

/** Vuelve a ocupar los bloques de un turno vencido, si siguen libres. */
async function reclaimSlots(tx: Tx, booking: LockedBooking): Promise<boolean> {
  const blocks = bookingBlocks(booking.startsAt, booking.blocks);
  const taken = await tx.bookingSlot.count({
    where: { barberId: booking.barberId, startsAt: { in: blocks } },
  });
  if (taken > 0) {
    return false;
  }

  await tx.bookingSlot.createMany({
    data: blocks.map((startsAt) => ({
      barberId: booking.barberId,
      bookingId: booking.id,
      startsAt,
    })),
  });
  return true;
}

async function canConfirm(
  tx: Tx,
  booking: LockedBooking,
  now: Date,
): Promise<boolean> {
  if (booking.startsAt <= now) {
    return false;
  }
  if (booking.status === "PENDING_DEPOSIT") {
    const held = await tx.bookingSlot.count({
      where: { bookingId: booking.id },
    });
    return held === booking.blocks;
  }
  return booking.status === "EXPIRED" && reclaimSlots(tx, booking);
}

/**
 * Aplica un pago de Mercado Pago una sola vez. Las notificaciones pueden
 * llegar repetidas, tarde o fuera de orden, así que este es el único lugar
 * que decide si el pago confirma el turno o queda para devolver.
 */
export async function applyPayment(
  payment: IncomingPayment,
  now: Date,
): Promise<PaymentOutcome> {
  return prisma.$transaction(async (tx) => {
    const booking = await lockBooking(tx, payment.bookingId);
    if (!booking) {
      return "UNKNOWN_BOOKING";
    }

    const existing = await tx.payment.findUnique({
      where: { providerPaymentId: payment.providerPaymentId },
    });
    if (existing?.status === "approved" && payment.status === "approved") {
      return "ALREADY_PROCESSED";
    }

    const record = {
      bookingId: booking.id,
      amount: Math.round(payment.amount),
      status: payment.status,
    };
    if (payment.status !== "approved") {
      await tx.payment.upsert({
        where: { providerPaymentId: payment.providerPaymentId },
        create: { ...record, providerPaymentId: payment.providerPaymentId },
        update: { status: payment.status },
      });
      return "RECORDED";
    }

    const confirmable =
      booking.depositStatus !== "PAID" &&
      record.amount >= booking.deposit &&
      (await canConfirm(tx, booking, now));

    await tx.payment.upsert({
      where: { providerPaymentId: payment.providerPaymentId },
      create: {
        ...record,
        providerPaymentId: payment.providerPaymentId,
        needsRefund: !confirmable,
      },
      update: { status: payment.status, needsRefund: !confirmable },
    });
    if (!confirmable) {
      return "NEEDS_REFUND";
    }

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "CONFIRMED",
        depositStatus: "PAID",
        paymentDeadline: null,
      },
    });
    return "CONFIRMED";
  });
}

/** Marca como devuelto a mano un pago tardío o duplicado. */
export async function clearPaymentRefund(paymentId: string): Promise<void> {
  await prisma.payment.update({
    where: { id: paymentId },
    data: { needsRefund: false, status: "refunded_manually" },
  });
}
