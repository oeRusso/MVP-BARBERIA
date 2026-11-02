import { createHmac } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import { isValidSignature } from "./mercadopago";

const secret = "clave-de-prueba";
const dataId = "123456";
const xRequestId = "solicitud-1";
const ts = "1700000000";

function sign(key: string) {
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hash = createHmac("sha256", key).update(manifest).digest("hex");
  return `ts=${ts},v1=${hash}`;
}

beforeAll(() => {
  process.env.MP_WEBHOOK_SECRET = secret;
});

describe("firma del webhook", () => {
  it("acepta una firma válida", () => {
    expect(
      isValidSignature({ xSignature: sign(secret), xRequestId, dataId }),
    ).toBe(true);
  });

  it("rechaza una firma hecha con otra clave", () => {
    expect(
      isValidSignature({ xSignature: sign("otra"), xRequestId, dataId }),
    ).toBe(false);
  });

  it("rechaza una firma de otro pago", () => {
    expect(
      isValidSignature({
        xSignature: sign(secret),
        xRequestId,
        dataId: "999",
      }),
    ).toBe(false);
  });

  it("rechaza una notificación sin firma", () => {
    expect(isValidSignature({ xSignature: null, xRequestId, dataId })).toBe(
      false,
    );
  });
});
