import { describe, expect, it } from "vitest";

import { canManageBarber, isStaff } from "./permissions";

const client = { isAdmin: false, barberId: null };
const barber = { isAdmin: false, barberId: "barbero-1" };
const admin = { isAdmin: true, barberId: null };
const ownerBarber = { isAdmin: true, barberId: "barbero-2" };

describe("permisos", () => {
  it("un cliente no es personal", () => {
    expect(isStaff(client)).toBe(false);
  });

  it("barberos y administradores son personal", () => {
    expect(isStaff(barber)).toBe(true);
    expect(isStaff(admin)).toBe(true);
  });

  it("un barbero gestiona solo sus propios datos", () => {
    expect(canManageBarber(barber, "barbero-1")).toBe(true);
    expect(canManageBarber(barber, "barbero-2")).toBe(false);
  });

  it("un administrador gestiona a cualquier barbero", () => {
    expect(canManageBarber(admin, "barbero-1")).toBe(true);
  });

  it("el dueño puede ser administrador y barbero a la vez", () => {
    expect(canManageBarber(ownerBarber, "barbero-1")).toBe(true);
    expect(canManageBarber(ownerBarber, "barbero-2")).toBe(true);
  });

  it("un cliente no gestiona barberos", () => {
    expect(canManageBarber(client, "barbero-1")).toBe(false);
  });
});
