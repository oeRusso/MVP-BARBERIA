import {
  BLOCK_MINUTES,
  GRID_ANCHOR_MINUTES,
  MAX_BOOKING_DAYS_AHEAD,
  MIN_BOOKING_NOTICE_MS,
} from "./rules";
import { addDays, type LocalDate, toInstant, toLocal } from "./time";

/** Tramo de trabajo en minutos locales; `end` no está incluido. */
export type WorkPeriod = {
  start: number;
  end: number;
};

export type BusyInterval = {
  start: Date;
  end: Date;
};

export type BookingWindowError = "TOO_SOON" | "TOO_FAR" | null;

const BLOCK_MS = BLOCK_MINUTES * 60_000;

export function isGridTime(minutes: number): boolean {
  const offset = minutes - GRID_ANCHOR_MINUTES;
  return ((offset % BLOCK_MINUTES) + BLOCK_MINUTES) % BLOCK_MINUTES === 0;
}

/** Inicios de la grilla cuyo bloque completo entra en el tramo. */
export function gridStarts(period: WorkPeriod): number[] {
  const starts: number[] = [];
  let minutes = period.start;

  while (!isGridTime(minutes)) {
    minutes += 1;
  }
  for (; minutes + BLOCK_MINUTES <= period.end; minutes += BLOCK_MINUTES) {
    starts.push(minutes);
  }

  return starts;
}

/** Instante de inicio de cada bloque que ocupa un turno. */
export function bookingBlocks(start: Date, blocks: number): Date[] {
  return Array.from(
    { length: blocks },
    (_, index) => new Date(start.getTime() + index * BLOCK_MS),
  );
}

export function bookingEnd(start: Date, blocks: number): Date {
  return new Date(start.getTime() + blocks * BLOCK_MS);
}

export function checkBookingWindow(start: Date, now: Date): BookingWindowError {
  if (start.getTime() - now.getTime() < MIN_BOOKING_NOTICE_MS) {
    return "TOO_SOON";
  }

  const lastDay = addDays(toLocal(now).date, MAX_BOOKING_DAYS_AHEAD);
  return toLocal(start).date > lastDay ? "TOO_FAR" : null;
}

function overlaps(start: Date, end: Date, busy: BusyInterval[]): boolean {
  return busy.some((interval) => start < interval.end && interval.start < end);
}

type FreeStartsInput = {
  date: LocalDate;
  periods: WorkPeriod[];
  blocks: number;
  busy: BusyInterval[];
};

/** Horarios libres según la agenda; es lo que usa la carga manual. */
export function freeStarts({
  date,
  periods,
  blocks,
  busy,
}: FreeStartsInput): Date[] {
  return periods.flatMap((period) => {
    const lastStart = period.end - blocks * BLOCK_MINUTES;

    return gridStarts(period)
      .filter((minutes) => minutes <= lastStart)
      .map((minutes) => toInstant(date, minutes))
      .filter((start) => !overlaps(start, bookingEnd(start, blocks), busy));
  });
}

/** Horarios que un cliente puede reservar online. */
export function availableStarts({
  now,
  ...input
}: FreeStartsInput & { now: Date }): Date[] {
  return freeStarts(input).filter(
    (start) => checkBookingWindow(start, now) === null,
  );
}
