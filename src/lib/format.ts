import { addDays, TIME_ZONE, toInstant, toLocal } from "./booking/time";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const day = new Intl.DateTimeFormat("es-AR", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});
const time = new Intl.DateTimeFormat("es-AR", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export const formatMoney = (amount: number) => money.format(amount);
export const formatDay = (instant: Date) => day.format(instant);
export const formatTime = (instant: Date) => time.format(instant);
export const formatDateTime = (instant: Date) =>
  `${formatDay(instant)}, ${formatTime(instant)}`;

export function minutesToClock(minutes: number): string {
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  return `${hours}:${String(minutes % 60).padStart(2, "0")}`;
}

export function clockToMinutes(clock: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(clock);
  if (!match) {
    return null;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Arma el enlace de WhatsApp. Los clientes escriben su número como en
 * Argentina, sin código de país, y wa.me necesita el formato internacional.
 */
export function whatsappLink(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const isInternational = phone.trim().startsWith("+") || digits.startsWith("54");
  const number = isInternational ? digits : `549${digits.replace(/^0/, "")}`;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** Días reservables, desde hoy hasta el límite indicado. */
export function nextDays(now: Date, count: number) {
  const today = toLocal(now).date;
  return Array.from({ length: count }, (_, index) => {
    const date = addDays(today, index);
    return { date, label: formatDay(toInstant(date, 12 * 60)) };
  });
}

export const WEEKDAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export const BOOKING_STATUS_LABELS = {
  PENDING_DEPOSIT: "Pendiente de seña",
  CONFIRMED: "Confirmado",
  COMPLETED: "Completado",
  NO_SHOW: "No asistió",
  CANCELLED: "Cancelado",
  EXPIRED: "Vencido",
} as const;

export const DEPOSIT_STATUS_LABELS = {
  PENDING: "Seña pendiente",
  PAID: "Seña pagada",
  NOT_REQUIRED: "Sin seña",
  REFUND_DUE: "Seña a devolver",
  REFUNDED: "Seña devuelta",
  RETAINED: "Seña retenida",
} as const;

export const BOOKING_ERRORS = {
  NO_SERVICES: "Elegí al menos un servicio disponible.",
  TOO_SOON: "Los turnos se reservan con al menos 2 horas de anticipación.",
  TOO_FAR: "Solo se puede reservar hasta 7 días hacia adelante.",
  CASH_UNAVAILABLE: "El efectivo solo está disponible para turnos a 3 horas o más.",
  TOO_MANY_BOOKINGS: "Ya tenés 2 turnos activos.",
  SLOT_UNAVAILABLE: "Ese horario ya no está disponible. Elegí otro.",
} as const;
