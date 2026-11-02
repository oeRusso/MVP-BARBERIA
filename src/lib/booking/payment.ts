import {
  CANCELLATION_NOTICE_MS,
  CASH_DEADLINE_BEFORE_START_MS,
  CASH_MIN_NOTICE_MS,
  CASH_PAYMENT_WINDOW_MS,
  MP_PAYMENT_WINDOW_MS,
} from "./rules";

export type PaymentMethod = "MERCADO_PAGO" | "CASH";

/** Qué pasa con la seña cuando se cancela un turno. */
export type CancellationOutcome =
  | "NOTHING_PAID"
  | "BARBER_DECIDES"
  | "FORFEITED"
  | "REFUND_DUE";

export function isCashAvailable(start: Date, now: Date): boolean {
  return start.getTime() - now.getTime() >= CASH_MIN_NOTICE_MS;
}

export function paymentDeadline(
  method: PaymentMethod,
  createdAt: Date,
  start: Date,
): Date {
  if (method === "MERCADO_PAGO") {
    return new Date(createdAt.getTime() + MP_PAYMENT_WINDOW_MS);
  }

  return new Date(
    Math.min(
      createdAt.getTime() + CASH_PAYMENT_WINDOW_MS,
      start.getTime() - CASH_DEADLINE_BEFORE_START_MS,
    ),
  );
}

export function clientCancellationOutcome(
  depositPaid: boolean,
  start: Date,
  now: Date,
): CancellationOutcome {
  if (!depositPaid) {
    return "NOTHING_PAID";
  }

  return start.getTime() - now.getTime() >= CANCELLATION_NOTICE_MS
    ? "BARBER_DECIDES"
    : "FORFEITED";
}

export function barberCancellationOutcome(
  depositPaid: boolean,
): CancellationOutcome {
  return depositPaid ? "REFUND_DUE" : "NOTHING_PAID";
}
