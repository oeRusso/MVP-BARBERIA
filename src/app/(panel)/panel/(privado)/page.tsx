import Link from "next/link";

import {
  cardClass,
  inputClass,
  mutedClass,
  noticeClass,
  secondaryButtonClass,
} from "@/components/ui";
import { addDays, toInstant, toLocal } from "@/lib/booking/time";
import {
  BOOKING_STATUS_LABELS,
  DEPOSIT_STATUS_LABELS,
  formatDateTime,
  formatDay,
  formatMoney,
  formatTime,
} from "@/lib/format";
import { prisma } from "@/server/db";
import { selectedBarber } from "@/server/panel";
import { requireStaff } from "@/server/session";

import {
  cancel,
  complete,
  confirmCash,
  decide,
  markNoShow,
  paymentRefundDone,
  refundDone,
  reschedule,
} from "./actions";
import { BarberPicker } from "./barber-picker";

const ERRORS: Record<string, string> = {
  estado: "Ese turno ya cambió de estado. Revisá la agenda.",
  horario: "Ese horario no está disponible.",
};

function whatsappLink(phone: string, name: string, when: string) {
  const digits = phone.replace(/\D/g, "");
  const message = `Hola ${name}, te escribimos de Chachi's Barber por tu turno del ${when}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; barbero?: string; error?: string }>;
}) {
  const { fecha, barbero, error } = await searchParams;
  const { actor } = await requireStaff();
  const { barbers, selected } = await selectedBarber(actor, barbero);
  if (!selected) {
    return <p className={mutedClass}>Todavía no hay barberos cargados.</p>;
  }

  const date = fecha ?? toLocal(new Date()).date;
  const dayStart = toInstant(date, 0);
  const bookings = await prisma.booking.findMany({
    where: {
      barberId: selected.id,
      startsAt: { gte: dayStart, lt: toInstant(addDays(date, 1), 0) },
    },
    orderBy: { startsAt: "asc" },
    include: { items: true },
  });

  const barberScope = { barberId: selected.id };
  const [pendingDecisions, refundsDue, paymentRefunds] = await Promise.all([
    prisma.booking.findMany({
      where: {
        ...barberScope,
        status: "CANCELLED",
        cancelledBy: "CLIENT",
        depositStatus: "PAID",
      },
      orderBy: { cancelledAt: "desc" },
    }),
    prisma.booking.findMany({
      where: { ...barberScope, depositStatus: "REFUND_DUE" },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.payment.findMany({
      where: { needsRefund: true, booking: barberScope },
      include: { booking: true },
    }),
  ]);

  const agendaHref = (barberId: string, day = date) =>
    `/panel?barbero=${barberId}&fecha=${day}`;

  return (
    <>
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Agenda: {formatDay(dayStart)}
        </h1>
        {error && ERRORS[error] && (
          <p role="alert" className={noticeClass}>
            {ERRORS[error]}
          </p>
        )}
        <BarberPicker
          barbers={barbers}
          selectedId={selected.id}
          href={(id) => agendaHref(id)}
        />
        <div className="flex gap-2">
          <Link href={agendaHref(selected.id, addDays(date, -1))} className={secondaryButtonClass}>
            Anterior
          </Link>
          <Link href={agendaHref(selected.id, toLocal(new Date()).date)} className={secondaryButtonClass}>
            Hoy
          </Link>
          <Link href={agendaHref(selected.id, addDays(date, 1))} className={secondaryButtonClass}>
            Siguiente
          </Link>
        </div>
      </section>

      {(pendingDecisions.length > 0 ||
        refundsDue.length > 0 ||
        paymentRefunds.length > 0) && (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Señas por resolver</h2>
          {pendingDecisions.map((booking) => (
            <div key={booking.id} className={`${noticeClass} flex flex-col gap-2`}>
              <p>
                {booking.clientName} canceló a tiempo el turno del{" "}
                {formatDateTime(booking.startsAt)}. Seña: {formatMoney(booking.deposit)}.
              </p>
              <div className="flex flex-wrap gap-2">
                <form action={decide.bind(null, booking.id, "REFUND_DUE")}>
                  <button className={secondaryButtonClass}>Devolver</button>
                </form>
                <form action={decide.bind(null, booking.id, "RETAINED")}>
                  <button className={secondaryButtonClass}>Retener</button>
                </form>
              </div>
            </div>
          ))}
          {refundsDue.map((booking) => (
            <div key={booking.id} className={`${noticeClass} flex flex-col gap-2`}>
              <p>
                Devolver {formatMoney(booking.deposit)} a {booking.clientName} en
                Mercado Pago.
              </p>
              <form action={refundDone.bind(null, booking.id)}>
                <button className={secondaryButtonClass}>Ya la devolví</button>
              </form>
            </div>
          ))}
          {paymentRefunds.map((payment) => (
            <div key={payment.id} className={`${noticeClass} flex flex-col gap-2`}>
              <p>
                Pago tardío o duplicado de {payment.booking.clientName}: devolver{" "}
                {formatMoney(payment.amount)} en Mercado Pago (pago{" "}
                {payment.providerPaymentId}).
              </p>
              <form action={paymentRefundDone.bind(null, payment.id)}>
                <button className={secondaryButtonClass}>Ya lo devolví</button>
              </form>
            </div>
          ))}
        </section>
      )}

      {bookings.length === 0 && <p className={mutedClass}>No hay turnos este día.</p>}

      <ul className="flex flex-col gap-3">
        {bookings.map((booking) => {
          const isConfirmed = booking.status === "CONFIRMED";
          const isPending = booking.status === "PENDING_DEPOSIT";
          const balance =
            booking.depositStatus === "PAID"
              ? booking.price - booking.deposit
              : booking.price;

          return (
            <li key={booking.id} className={`${cardClass} flex flex-col gap-3`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-medium">{formatTime(booking.startsAt)}</p>
                  <p>{booking.clientName}</p>
                  <p className={mutedClass}>
                    {booking.items.map(({ name }) => name).join(" + ")}
                  </p>
                </div>
                <div className={`${mutedClass} text-right`}>
                  <p>{BOOKING_STATUS_LABELS[booking.status]}</p>
                  <p>{DEPOSIT_STATUS_LABELS[booking.depositStatus]}</p>
                  {isConfirmed && <p>A cobrar: {formatMoney(balance)}</p>}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <a
                  href={whatsappLink(
                    booking.clientPhone,
                    booking.clientName,
                    formatDateTime(booking.startsAt),
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className={secondaryButtonClass}
                >
                  WhatsApp
                </a>
                {isPending && booking.paymentMethod === "CASH" && (
                  <form action={confirmCash.bind(null, booking.id)}>
                    <button className={secondaryButtonClass}>Confirmar seña</button>
                  </form>
                )}
                {isConfirmed && (
                  <>
                    <form action={complete.bind(null, booking.id)}>
                      <button className={secondaryButtonClass}>Completado</button>
                    </form>
                    <form action={markNoShow.bind(null, booking.id)}>
                      <button className={secondaryButtonClass}>No asistió</button>
                    </form>
                  </>
                )}
                {(isConfirmed || isPending) && (
                  <form action={cancel.bind(null, booking.id)}>
                    <button className={secondaryButtonClass}>Cancelar</button>
                  </form>
                )}
              </div>

              {(isConfirmed || booking.status === "NO_SHOW") && (
                <details>
                  <summary className="min-h-11 cursor-pointer content-center text-sm">
                    Reprogramar
                  </summary>
                  <form
                    action={reschedule.bind(null, booking.id)}
                    className="flex flex-col gap-2 pt-2 sm:flex-row"
                  >
                    <input
                      type="date"
                      name="date"
                      required
                      defaultValue={date}
                      aria-label="Fecha"
                      className={inputClass}
                    />
                    <input
                      type="time"
                      name="time"
                      required
                      aria-label="Hora"
                      className={inputClass}
                    />
                    <button className={secondaryButtonClass}>Mover</button>
                  </form>
                </details>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
