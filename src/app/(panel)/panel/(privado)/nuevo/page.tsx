import {
  buttonClass,
  inputClass,
  mutedClass,
  noticeClass,
} from "@/components/ui";
import { toLocal } from "@/lib/booking/time";
import { BOOKING_ERRORS, formatMoney } from "@/lib/format";
import { prisma } from "@/server/db";
import { selectedBarber } from "@/server/panel";
import { requireStaff } from "@/server/session";

import { createManual } from "../actions";
import { BarberPicker } from "../barber-picker";

const FORM_ERRORS: Record<string, string> = {
  ...BOOKING_ERRORS,
  datos: "Completá nombre, teléfono, fecha y hora.",
};

export default async function ManualBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ barbero?: string; error?: string }>;
}) {
  const { barbero, error } = await searchParams;
  const { actor } = await requireStaff();
  const { barbers, selected } = await selectedBarber(actor, barbero);
  if (!selected) {
    return <p className={mutedClass}>Todavía no hay barberos cargados.</p>;
  }

  const services = await prisma.service.findMany({
    where: { barberId: selected.id, active: true },
    orderBy: { name: "asc" },
  });

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Cargar turno</h1>
      <p className={mutedClass}>
        Para clientes que reservan por WhatsApp o llegan al local.
      </p>
      <BarberPicker
        barbers={barbers}
        selectedId={selected.id}
        href={(id) => `/panel/nuevo?barbero=${id}`}
      />
      {error && FORM_ERRORS[error] && (
        <p role="alert" className={noticeClass}>
          {FORM_ERRORS[error]}
        </p>
      )}

      <form action={createManual.bind(null, selected.id)} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Nombre
          <input name="clientName" required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Teléfono
          <input name="clientPhone" type="tel" required className={inputClass} />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Servicios</legend>
          {services.map((service) => (
            <label key={service.id} className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                name="serviceId"
                value={service.id}
                className="size-5"
              />
              {service.name} ({formatMoney(service.price)})
            </label>
          ))}
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Fecha
            <input
              name="date"
              type="date"
              required
              defaultValue={toLocal(new Date()).date}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Hora
            <input name="time" type="time" required className={inputClass} />
          </label>
        </div>

        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="depositPaid" className="size-5" />
          Dejó seña en efectivo
        </label>

        <button className={buttonClass}>Cargar turno</button>
      </form>
    </section>
  );
}
