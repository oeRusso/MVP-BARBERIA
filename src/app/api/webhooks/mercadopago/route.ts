import { fetchPayment, isValidSignature } from "@/server/mercadopago";
import { applyPayment } from "@/server/payments";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const dataId = url.searchParams.get("data.id");
  const type = url.searchParams.get("type");

  const valid = isValidSignature({
    xSignature: request.headers.get("x-signature"),
    xRequestId: request.headers.get("x-request-id"),
    dataId,
  });
  if (!valid) {
    return new Response(null, { status: 401 });
  }

  // Mercado Pago también avisa de otros eventos que aquí no importan.
  if (type !== "payment" || !dataId) {
    return new Response(null, { status: 200 });
  }

  const payment = await fetchPayment(dataId);
  if (payment) {
    await applyPayment(payment, new Date());
  }
  return new Response(null, { status: 200 });
}
