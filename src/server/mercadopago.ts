import {
  MercadoPagoConfig,
  Payment,
  Preference,
  WebhookSignatureValidator,
} from "mercadopago";

import type { IncomingPayment } from "./payments";

function client() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Falta la variable de entorno MP_ACCESS_TOKEN");
  }
  return new MercadoPagoConfig({ accessToken });
}

type CheckoutInput = {
  bookingId: string;
  title: string;
  deposit: number;
  payerEmail?: string;
  deadline: Date;
};

/** Crea el pago de la seña y devuelve el enlace de Mercado Pago. */
export async function createCheckout({
  bookingId,
  title,
  deposit,
  payerEmail,
  deadline,
}: CheckoutInput): Promise<string> {
  const appUrl = process.env.BETTER_AUTH_URL;
  const backUrl = `${appUrl}/turnos/${bookingId}`;

  const preference = await new Preference(client()).create({
    body: {
      external_reference: bookingId,
      items: [
        {
          id: bookingId,
          title,
          quantity: 1,
          unit_price: deposit,
          currency_id: "ARS",
        },
      ],
      payer: payerEmail ? { email: payerEmail } : undefined,
      back_urls: { success: backUrl, pending: backUrl, failure: backUrl },
      auto_return: "approved",
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
      expires: true,
      expiration_date_to: deadline.toISOString(),
      date_of_expiration: deadline.toISOString(),
    },
  });

  if (!preference.init_point) {
    throw new Error("Mercado Pago no devolvió el enlace de pago");
  }
  return preference.init_point;
}

/** Consulta el pago en Mercado Pago, que es la fuente de verdad. */
export async function fetchPayment(
  id: string,
): Promise<IncomingPayment | null> {
  const payment = await new Payment(client()).get({ id });

  if (!payment.id || !payment.external_reference) {
    return null;
  }
  return {
    providerPaymentId: String(payment.id),
    bookingId: payment.external_reference,
    amount: payment.transaction_amount ?? 0,
    status: payment.status ?? "unknown",
  };
}

type SignatureInput = {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
};

export function isValidSignature({
  xSignature,
  xRequestId,
  dataId,
}: SignatureInput): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("Falta la variable de entorno MP_WEBHOOK_SECRET");
  }

  try {
    WebhookSignatureValidator.validate({
      xSignature: xSignature ?? "",
      xRequestId: xRequestId ?? "",
      dataId: dataId ?? "",
      secret,
    });
    return true;
  } catch {
    return false;
  }
}
