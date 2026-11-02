"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { isCashAvailable } from "@/lib/booking/payment";
import { BOOKING_ERRORS, formatDateTime, formatTime } from "@/lib/format";
import { cancelByClient } from "@/server/booking-status";
import { createOnlineBooking, getAvailableStarts } from "@/server/bookings";
import { prisma } from "@/server/db";
import { notifyBookingCreated } from "@/server/mailer";
import { createCheckout } from "@/server/mercadopago";
import { requireClient } from "@/server/session";

const slotsInput = z.object({
  barberId: z.string().min(1),
  date: z.iso.date(),
  serviceIds: z.array(z.string().min(1)).min(1),
});

export type Slot = {
  start: string;
  label: string;
  cashAvailable: boolean;
};

export async function loadSlots(input: unknown): Promise<Slot[]> {
  const parsed = slotsInput.safeParse(input);
  if (!parsed.success) {
    return [];
  }

  const { barberId, date, serviceIds } = parsed.data;
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds }, barberId, active: true },
    select: { blocks: true },
  });
  const blocks = services.reduce((total, service) => total + service.blocks, 0);
  if (blocks === 0) {
    return [];
  }

  const now = new Date();
  const starts = await getAvailableStarts(barberId, date, blocks, now);
  return starts.map((start) => ({
    start: start.toISOString(),
    label: formatTime(start),
    cashAvailable: isCashAvailable(start, now),
  }));
}

const reserveInput = z.object({
  barberId: z.string().min(1),
  serviceIds: z.array(z.string().min(1)).min(1),
  start: z.iso.datetime(),
  method: z.enum(["MERCADO_PAGO", "CASH"]),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{7,19}$/),
});

export async function reserve(input: unknown): Promise<{ error: string }> {
  const user = await requireClient();

  const parsed = reserveInput.safeParse(input);
  if (!parsed.success) {
    return { error: "Revisá los datos: el teléfono tiene que ser válido." };
  }
  const { phone, start, ...booking } = parsed.data;

  await prisma.user.update({ where: { id: user.id }, data: { phone } });

  const result = await createOnlineBooking({
    ...booking,
    clientId: user.id,
    start: new Date(start),
    now: new Date(),
  });
  if (!result.ok) {
    return { error: BOOKING_ERRORS[result.error] };
  }

  await notifyBookingCreated(result.bookingId);
  redirect(`/turnos/${result.bookingId}`);
}

async function ownBooking(bookingId: string, clientId: string) {
  return prisma.booking.findFirst({
    where: { id: bookingId, clientId },
    include: { barber: { select: { displayName: true } } },
  });
}

export async function payDeposit(bookingId: string) {
  const user = await requireClient();
  const booking = await ownBooking(bookingId, user.id);
  if (
    !booking ||
    booking.status !== "PENDING_DEPOSIT" ||
    booking.paymentMethod !== "MERCADO_PAGO" ||
    !booking.paymentDeadline
  ) {
    redirect(`/turnos/${bookingId}`);
  }

  let checkoutUrl: string;
  try {
    checkoutUrl = await createCheckout({
      bookingId,
      title: `Seña - ${booking.barber.displayName} - ${formatDateTime(booking.startsAt)}`,
      deposit: booking.deposit,
      payerEmail: user.email,
      deadline: booking.paymentDeadline,
    });
  } catch (error) {
    console.error("No se pudo crear el pago", bookingId, error);
    redirect(`/turnos/${bookingId}?error=pago`);
  }
  redirect(checkoutUrl);
}

export async function cancelBooking(bookingId: string) {
  const user = await requireClient();
  await cancelByClient(bookingId, user.id, new Date());
  revalidatePath("/mis-turnos");
  revalidatePath(`/turnos/${bookingId}`);
}
