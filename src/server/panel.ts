import type { Actor } from "@/lib/permissions";

import { prisma } from "./db";

/** Barberos que ve quien usa el panel: el propio, o todos si es administrador. */
export async function visibleBarbers(actor: Actor) {
  return prisma.barber.findMany({
    where: actor.isAdmin ? {} : { id: actor.barberId ?? "" },
    orderBy: { displayName: "asc" },
    select: { id: true, displayName: true },
  });
}

/** Elige el barbero pedido si es visible; si no, el propio o el primero. */
export async function selectedBarber(actor: Actor, requested?: string) {
  const barbers = await visibleBarbers(actor);
  const selected =
    barbers.find(({ id }) => id === requested) ??
    barbers.find(({ id }) => id === actor.barberId) ??
    barbers[0] ??
    null;
  return { barbers, selected };
}

export async function hasBookingsBetween(
  barberId: string,
  start: Date,
  end: Date,
  now: Date,
): Promise<boolean> {
  const count = await prisma.bookingSlot.count({
    where: {
      barberId,
      startsAt: { gte: start, lt: end },
      NOT: {
        booking: {
          status: "PENDING_DEPOSIT",
          paymentDeadline: { lte: now },
        },
      },
    },
  });
  return count > 0;
}
