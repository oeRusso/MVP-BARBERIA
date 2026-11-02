import { describe, expect, it } from "vitest";

import {
  availableStarts,
  bookingBlocks,
  bookingEnd,
  checkBookingWindow,
  gridStarts,
  isGridTime,
} from "./availability";
import { toInstant, toLocal } from "./time";

const time = (hours: number, minutes = 0) => hours * 60 + minutes;
const defaultPeriods = [
  { start: time(10), end: time(12) },
  { start: time(13), end: time(22) },
];
const date = "2026-11-10";
const now = new Date("2026-11-09T13:00:00.000Z");
const label = (instant: Date) => {
  const { minutes } = toLocal(instant);
  const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
  return `${hours}:${String(minutes % 60).padStart(2, "0")}`;
};

describe("grilla", () => {
  it("tiene 14 bloques con el horario inicial", () => {
    const starts = defaultPeriods.flatMap(gridStarts);

    expect(starts).toHaveLength(14);
    expect(starts.slice(0, 3)).toEqual([time(10), time(10, 45), time(13)]);
    expect(starts.at(-1)).toBe(time(21, 15));
  });

  it("no ofrece un bloque que termina después del descanso", () => {
    expect(gridStarts({ start: time(10), end: time(12) })).not.toContain(
      time(11, 30),
    );
  });

  it("alinea un horario que no empieza en la grilla", () => {
    expect(isGridTime(time(14))).toBe(false);
    expect(gridStarts({ start: time(14), end: time(16) })).toEqual([
      time(14, 30),
      time(15, 15),
    ]);
  });
});

describe("bloques de un turno", () => {
  it("un combo ocupa dos bloques consecutivos", () => {
    const start = toInstant(date, time(13));

    expect(bookingBlocks(start, 2).map(label)).toEqual(["13:00", "13:45"]);
    expect(label(bookingEnd(start, 2))).toBe("14:30");
  });
});

describe("ventana de reserva", () => {
  it("rechaza con menos de 2 horas de anticipación", () => {
    const start = new Date(now.getTime() + 119 * 60_000);
    expect(checkBookingWindow(start, now)).toBe("TOO_SOON");
  });

  it("acepta exactamente 2 horas de anticipación", () => {
    const start = new Date(now.getTime() + 120 * 60_000);
    expect(checkBookingWindow(start, now)).toBeNull();
  });

  it("acepta hasta 7 días hacia adelante", () => {
    expect(checkBookingWindow(toInstant("2026-11-16", time(21)), now)).toBeNull();
  });

  it("rechaza más de 7 días hacia adelante", () => {
    expect(checkBookingWindow(toInstant("2026-11-17", time(10)), now)).toBe(
      "TOO_FAR",
    );
  });
});

describe("horarios disponibles", () => {
  it("devuelve todos los bloques de un día libre", () => {
    const starts = availableStarts({
      date,
      periods: defaultPeriods,
      blocks: 1,
      busy: [],
      now,
    });

    expect(starts).toHaveLength(14);
  });

  it("devuelve vacío si el barbero no trabaja", () => {
    expect(
      availableStarts({ date, periods: [], blocks: 1, busy: [], now }),
    ).toEqual([]);
  });

  it("excluye un horario ocupado", () => {
    const start = toInstant(date, time(13));
    const starts = availableStarts({
      date,
      periods: defaultPeriods,
      blocks: 1,
      busy: [{ start, end: bookingEnd(start, 1) }],
      now,
    });

    expect(starts.map(label)).not.toContain("13:00");
    expect(starts).toHaveLength(13);
  });

  it("excluye los horarios cubiertos por un bloqueo", () => {
    const starts = availableStarts({
      date,
      periods: defaultPeriods,
      blocks: 1,
      busy: [
        { start: toInstant(date, time(13)), end: toInstant(date, time(15)) },
      ],
      now,
    });

    expect(starts.map(label)).toEqual(
      expect.not.arrayContaining(["13:00", "13:45", "14:30"]),
    );
    expect(starts.map(label)).toContain("15:15");
  });

  it("un combo no empieza si el bloque siguiente está ocupado", () => {
    const next = toInstant(date, time(13, 45));
    const starts = availableStarts({
      date,
      periods: defaultPeriods,
      blocks: 2,
      busy: [{ start: next, end: bookingEnd(next, 1) }],
      now,
    });

    expect(starts.map(label)).not.toContain("13:00");
    expect(starts.map(label)).toContain("14:30");
  });

  it("un combo no cruza el descanso", () => {
    const starts = availableStarts({
      date,
      periods: defaultPeriods,
      blocks: 2,
      busy: [],
      now,
    });

    expect(starts.map(label)).toContain("10:00");
    expect(starts.map(label)).not.toContain("10:45");
  });

  it("un combo no termina después del cierre", () => {
    const starts = availableStarts({
      date,
      periods: defaultPeriods,
      blocks: 2,
      busy: [],
      now,
    });

    expect(starts.map(label).at(-1)).toBe("20:30");
  });

  it("oculta los horarios dentro de las 2 horas mínimas", () => {
    const starts = availableStarts({
      date,
      periods: defaultPeriods,
      blocks: 1,
      busy: [],
      now: toInstant(date, time(12)),
    });

    expect(starts.map(label)[0]).toBe("14:30");
  });
});
