import Link from "next/link";

import { cardClass, mutedClass } from "@/components/ui";
import { BOOKING_STATUS_LABELS, formatDateTime } from "@/lib/format";
import { prisma } from "@/server/db";
import { requireClient } from "@/server/session";

export default async function MyBookingsPage() {
  const user = await requireClient();
  const bookings = await prisma.booking.findMany({
    where: { clientId: user.id },
    orderBy: { startsAt: "desc" },
    take: 30,
    include: { barber: { select: { displayName: true } } },
  });

  return (
    <section className="flex flex-col gap-4 pt-4">
      <h1 className="text-2xl font-semibold tracking-tight">Mis turnos</h1>

      {bookings.length === 0 && (
        <p className={mutedClass}>
          Todavía no tenés turnos.{" "}
          <Link href="/" className="underline underline-offset-4">
            Reservá uno
          </Link>
          .
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {bookings.map((booking) => (
          <li key={booking.id}>
            <Link
              href={`/turnos/${booking.id}`}
              className={`${cardClass} flex items-center justify-between gap-4 transition-colors hover:bg-foreground/5`}
            >
              <span>
                <span className="block font-medium">
                  {formatDateTime(booking.startsAt)}
                </span>
                <span className={mutedClass}>{booking.barber.displayName}</span>
              </span>
              <span className={mutedClass}>
                {BOOKING_STATUS_LABELS[booking.status]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
