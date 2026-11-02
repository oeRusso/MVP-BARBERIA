import {
  buttonClass,
  cardClass,
  inputClass,
  mutedClass,
  noticeClass,
} from "@/components/ui";
import { minutesToClock, WEEKDAYS } from "@/lib/format";
import { prisma } from "@/server/db";
import { selectedBarber } from "@/server/panel";
import { requireStaff } from "@/server/session";

import { saveSchedule } from "../actions";
import { BarberPicker } from "../barber-picker";

/** Lunes primero, que es como se lee una semana de trabajo. */
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ barbero?: string; error?: string; guardado?: string }>;
}) {
  const { barbero, error, guardado } = await searchParams;
  const { actor } = await requireStaff();
  const { barbers, selected } = await selectedBarber(actor, barbero);
  if (!selected) {
    return <p className={mutedClass}>Todavía no hay barberos cargados.</p>;
  }

  const periods = await prisma.workPeriod.findMany({
    where: { barberId: selected.id },
    orderBy: { startMinutes: "asc" },
  });

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Horarios</h1>
      <p className={mutedClass}>
        Los turnos se cuentan cada 45 minutos desde las 10:00. El segundo tramo
        es opcional, para dejar un descanso.
      </p>
      <BarberPicker
        barbers={barbers}
        selectedId={selected.id}
        href={(id) => `/panel/horarios?barbero=${id}`}
      />
      {error && (
        <p role="alert" className={noticeClass}>
          Revisá los horarios: cada tramo debe terminar después de empezar y sin
          pisar al anterior.
        </p>
      )}
      {guardado && <p className={noticeClass}>Horarios guardados.</p>}

      <form action={saveSchedule.bind(null, selected.id)} className="flex flex-col gap-3">
        {DISPLAY_ORDER.map((weekday) => {
          const [first, second] = periods.filter(
            (period) => period.weekday === weekday,
          );

          return (
            <fieldset key={weekday} className={`${cardClass} flex flex-col gap-2`}>
              <legend className="sr-only">{WEEKDAYS[weekday]}</legend>
              <label className="flex min-h-11 items-center gap-3 font-medium">
                <input
                  type="checkbox"
                  name={`works-${weekday}`}
                  defaultChecked={Boolean(first)}
                  className="size-5"
                />
                {WEEKDAYS[weekday]}
              </label>
              {(
                [
                  ["a", "Primer tramo", first],
                  ["b", "Segundo tramo", second],
                ] as const
              ).map(([part, label, period]) => (
                <div key={part} className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    name={`${part}-start-${weekday}`}
                    aria-label={`${label}, inicio`}
                    defaultValue={
                      period ? minutesToClock(period.startMinutes) : undefined
                    }
                    className={inputClass}
                  />
                  <input
                    type="time"
                    name={`${part}-end-${weekday}`}
                    aria-label={`${label}, fin`}
                    defaultValue={
                      period ? minutesToClock(period.endMinutes) : undefined
                    }
                    className={inputClass}
                  />
                </div>
              ))}
            </fieldset>
          );
        })}
        <button className={buttonClass}>Guardar horarios</button>
      </form>
    </section>
  );
}
