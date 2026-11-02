import { describe, expect, it } from "vitest";

import { whatsappLink } from "./format";

const number = (phone: string) =>
  new URL(whatsappLink(phone, "hola")).pathname.slice(1);

describe("enlace de WhatsApp", () => {
  it("agrega el código de Argentina a un número local", () => {
    expect(number("11 5555 0001")).toBe("5491155550001");
  });

  it("quita el 0 inicial del código de área", () => {
    expect(number("011 5555-0001")).toBe("5491155550001");
  });

  it("respeta un número que ya tiene código de país", () => {
    expect(number("+54 9 11 5555 0001")).toBe("5491155550001");
    expect(number("5491155550001")).toBe("5491155550001");
  });

  it("respeta un número extranjero con +", () => {
    expect(number("+598 99 123 456")).toBe("59899123456");
  });

  it("codifica el mensaje", () => {
    expect(whatsappLink("1155550001", "Hola & chau")).toContain(
      "text=Hola%20%26%20chau",
    );
  });
});
