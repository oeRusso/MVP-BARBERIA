import { DEPOSIT_PERCENT } from "./rules";

export type ServiceSelection = {
  /** Precio en pesos enteros. */
  price: number;
  blocks: number;
};

export type BookingTotals = {
  price: number;
  blocks: number;
  deposit: number;
};

export function depositFor(price: number): number {
  return Math.round((price * DEPOSIT_PERCENT) / 100);
}

/** Un combo suma los precios y bloques de sus servicios. */
export function bookingTotals(services: ServiceSelection[]): BookingTotals {
  if (services.length === 0) {
    throw new Error("Una reserva necesita al menos un servicio");
  }

  const price = services.reduce((total, service) => total + service.price, 0);
  const blocks = services.reduce((total, service) => total + service.blocks, 0);

  return { price, blocks, deposit: depositFor(price) };
}
