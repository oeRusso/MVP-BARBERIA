import { formatDateTime, formatMoney } from "@/lib/format";

import { prisma } from "./db";

type Email = {
  to: string;
  subject: string;
  text: string;
};

async function sendEmail({ to, subject, text }: Email): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn("Email sin enviar: falta RESEND_API_KEY o EMAIL_FROM");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!response.ok) {
    throw new Error(`Resend respondió ${response.status}`);
  }
}

/** Avisa al cliente y al barbero. Un fallo de email nunca frena la reserva. */
export async function notifyBookingCreated(bookingId: string): Promise<void> {
  try {
    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: {
        client: { select: { email: true } },
        barber: { include: { user: { select: { email: true } } } },
        items: true,
      },
    });

    const when = formatDateTime(booking.startsAt);
    const services = booking.items.map(({ name }) => name).join(" + ");
    const summary = [
      `Barbero: ${booking.barber.displayName}`,
      `Fecha: ${when}`,
      `Servicios: ${services}`,
      `Total: ${formatMoney(booking.price)}`,
      `Seña: ${formatMoney(booking.deposit)}`,
    ].join("\n");

    const emails: Email[] = [
      {
        to: booking.barber.user.email,
        subject: `Turno nuevo: ${when}`,
        text: `Cliente: ${booking.clientName} (${booking.clientPhone})\n${summary}`,
      },
    ];
    if (booking.client) {
      emails.push({
        to: booking.client.email,
        subject: `Tu reserva en Chachi's Barber: ${when}`,
        text: `Recibimos tu reserva.\n\n${summary}\n\nEl turno se confirma cuando se acredita la seña.`,
      });
    }

    await Promise.all(emails.map(sendEmail));
  } catch (error) {
    console.error("No se pudo enviar el aviso del turno", bookingId, error);
  }
}
