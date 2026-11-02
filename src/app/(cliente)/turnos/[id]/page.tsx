import Link from "next/link";
import { notFound } from "next/navigation";

import {
  buttonClass,
  cardClass,
  mutedClass,
  noticeClass,
  secondaryButtonClass,
} from "@/components/ui";
import { CANCELLATION_NOTICE_MS } from "@/lib/booking/rules";
import {
  BOOKING_STATUS_LABELS,
  DEPOSIT_STATUS_LABELS,
  formatDateTime,
  formatMoney,
} from "@/lib/format";
import { prisma } from "@/server/db";
import { requireClient } from "@/server/session";

import { cancelBooking, payDeposit } from "../../actions";

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const user = await requireClient();

  const booking = await prisma.booking.findFirst({
    where: { id, clientId: user.id },
    include: {
      barber: { select: { displayName: true } },
      items: true,
    },
  });
  if (!booking) {
    notFound();
  }

  const now = new Date();
  const isPending = booking.status === "PENDING_DEPOSIT";
  const isOpen = isPending || booking.status === "CONFIRMED";
  const canCancel = isOpen && booking.startsAt > now;
  const losesDeposit =
    booking.depositStatus === "PAID" &&
    booking.startsAt.getTime() - now.getTime() < CANCELLATION_NOTICE_MS;

  return (
    <section className="flex flex-col gap-4 pt-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        {BOOKING_STATUS_LABELS[booking.status]}
      </h1>

      {error === "pago" && (
        <p role="alert" className={noticeClass}>
          No pudimos abrir Mercado Pago. Probá de nuevo en unos minutos.
        </p>
      )}

      <dl className={`${cardClass} flex flex-col gap-2`}>
        <div className="flex justify-between gap-4">
          <dt className={mutedClass}>Barbero</dt>
          <dd>{booking.barber.displayName}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className={mutedClass}>Fecha</dt>
          <dd>{formatDateTime(booking.startsAt)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className={mutedClass}>Servicios</dt>
          <dd className="text-right">
            {booking.items.map(({ name }) => name).join(" + ")}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className={mutedClass}>Total</dt>
          <dd>{formatMoney(booking.price)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className={mutedClass}>Seña</dt>
          <dd>
            {formatMoney(booking.deposit)} ({DEPOSIT_STATUS_LABELS[booking.depositStatus]})
          </dd>
        </div>
      </dl>

      {isPending && booking.paymentDeadline && (
        <p className={noticeClass}>
          {booking.paymentMethod === "CASH"
            ? `Llevá ${formatMoney(booking.deposit)} al local antes del ${formatDateTime(booking.paymentDeadline)}. Si no, el horario se libera solo.`
            : `Pagá la seña antes del ${formatDateTime(booking.paymentDeadline)}. Si ya pagaste, la confirmación puede tardar unos segundos.`}
        </p>
      )}

      {isPending && booking.paymentMethod === "MERCADO_PAGO" && (
        <form action={payDeposit.bind(null, booking.id)}>
          <button type="submit" className={`${buttonClass} w-full`}>
            Pagar {formatMoney(booking.deposit)} con Mercado Pago
          </button>
        </form>
      )}

      {canCancel && (
        <form action={cancelBooking.bind(null, booking.id)} className="flex flex-col gap-2">
          {losesDeposit && (
            <p className={mutedClass}>
              Faltan menos de 24 horas: si cancelás, perdés la seña.
            </p>
          )}
          <button type="submit" className={secondaryButtonClass}>
            Cancelar turno
          </button>
        </form>
      )}

      <Link href="/mis-turnos" className="text-sm underline underline-offset-4">
        Ver mis turnos
      </Link>
    </section>
  );
}
