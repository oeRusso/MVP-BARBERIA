import {
  buttonClass,
  cardClass,
  inputClass,
  mutedClass,
  noticeClass,
  secondaryButtonClass,
} from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { prisma } from "@/server/db";
import { selectedBarber } from "@/server/panel";
import { requireStaff } from "@/server/session";

import { addTimeOff, removeTimeOff } from "../actions";
import { BarberPicker } from "../barber-picker";

const ERRORS: Record<string, string> = {
  datos: "Revisá las fechas: el fin debe ser posterior al inicio.",
  turnos: "Hay turnos en ese rango. Reprogramalos o cancelalos antes de bloquear.",
};

export default async function TimeOffPage({
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

  const timeOff = await prisma.timeOff.findMany({
    where: { barberId: selected.id, endsAt: { gt: new Date() } },
    orderBy: { startsAt: "asc" },
  });

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Bloqueos</h1>
      <p className={mutedClass}>Horarios, días o feriados en los que no atendés.</p>
      <BarberPicker
        barbers={barbers}
        selectedId={selected.id}
        href={(id) => `/panel/bloqueos?barbero=${id}`}
      />
      {error && ERRORS[error] && (
        <p role="alert" className={noticeClass}>
          {ERRORS[error]}
        </p>
      )}

      <form
        action={addTimeOff.bind(null, selected.id)}
        className={`${cardClass} flex flex-col gap-3`}
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Desde
            <input name="startDate" type="date" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Hora
            <input
              name="startTime"
              type="time"
              required
              defaultValue="10:00"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Hasta
            <input name="endDate" type="date" required className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Hora
            <input
              name="endTime"
              type="time"
              required
              defaultValue="22:00"
              className={inputClass}
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Motivo (opcional)
          <input name="reason" className={inputClass} />
        </label>
        <button className={buttonClass}>Bloquear</button>
      </form>

      {timeOff.length === 0 && <p className={mutedClass}>No hay bloqueos próximos.</p>}

      <ul className="flex flex-col gap-2">
        {timeOff.map((item) => (
          <li key={item.id} className={`${cardClass} flex items-center justify-between gap-4`}>
            <div>
              <p>
                {formatDateTime(item.startsAt)} a {formatDateTime(item.endsAt)}
              </p>
              {item.reason && <p className={mutedClass}>{item.reason}</p>}
            </div>
            <form action={removeTimeOff.bind(null, selected.id, item.id)}>
              <button className={secondaryButtonClass}>Quitar</button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
