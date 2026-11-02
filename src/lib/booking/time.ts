export const TIME_ZONE = "America/Argentina/Buenos_Aires";

/** Fecha del calendario local, en formato YYYY-MM-DD. */
export type LocalDate = string;

export type LocalDateTime = {
  date: LocalDate;
  /** Minutos desde las 00:00 locales. */
  minutes: number;
};

const localFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function toLocal(instant: Date): LocalDateTime {
  const parts = Object.fromEntries(
    localFormatter.formatToParts(instant).map((part) => [part.type, part.value]),
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function parseLocalDate(date: LocalDate): [number, number, number] {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Fecha inválida: ${date}`);
  }
  return [year, month, day];
}

/** Convierte una hora local de Argentina al instante UTC que le corresponde. */
export function toInstant(date: LocalDate, minutes: number): Date {
  const [year, month, day] = parseLocalDate(date);
  const asIfUtc = Date.UTC(year, month - 1, day, 0, minutes);

  const local = toLocal(new Date(asIfUtc));
  const [localYear, localMonth, localDay] = parseLocalDate(local.date);
  const shown = Date.UTC(localYear, localMonth - 1, localDay, 0, local.minutes);

  return new Date(asIfUtc - (shown - asIfUtc));
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const [year, month, day] = parseLocalDate(date);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

/** Día de la semana de una fecha local: 0 es domingo y 6 es sábado. */
export function weekdayOf(date: LocalDate): number {
  const [year, month, day] = parseLocalDate(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}
