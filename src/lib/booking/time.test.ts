import { describe, expect, it } from "vitest";

import { addDays, toInstant, toLocal, weekdayOf } from "./time";

describe("conversión de zona horaria", () => {
  it("las 10:00 de Argentina son las 13:00 UTC", () => {
    expect(toInstant("2026-11-10", 600).toISOString()).toBe(
      "2026-11-10T13:00:00.000Z",
    );
  });

  it("vuelve a la fecha y hora local desde UTC", () => {
    expect(toLocal(new Date("2026-11-10T13:00:00.000Z"))).toEqual({
      date: "2026-11-10",
      minutes: 600,
    });
  });

  it("respeta el cambio de día entre UTC y Argentina", () => {
    expect(toLocal(new Date("2026-11-11T01:00:00.000Z"))).toEqual({
      date: "2026-11-10",
      minutes: 22 * 60,
    });
  });
});

describe("calendario local", () => {
  it("suma días cruzando el fin de mes y de año", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("identifica el día de la semana", () => {
    expect(weekdayOf("2026-11-01")).toBe(0);
    expect(weekdayOf("2026-11-07")).toBe(6);
  });
});
