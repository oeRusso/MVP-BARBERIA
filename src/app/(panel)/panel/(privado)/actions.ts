"use server";

import { hashPassword } from "better-auth/crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { toInstant } from "@/lib/booking/time";
import { clockToMinutes } from "@/lib/format";
import { MAX_ADMINS } from "@/lib/permissions";
import {
  cancelByStaff,
  closeBooking,
  confirmCashDeposit,
  decideDeposit,
  markDepositRefunded,
  type StatusResult,
} from "@/server/booking-status";
import { createManualBooking, rescheduleBooking } from "@/server/bookings";
import { prisma } from "@/server/db";
import { hasBookingsBetween } from "@/server/panel";
import { clearPaymentRefund } from "@/server/payments";
import { requireAdmin, requireBarberAccess } from "@/server/session";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

function refresh() {
  revalidatePath("/panel", "layout");
}

function finish(result: StatusResult) {
  refresh();
  if (!result.ok) {
    redirect("/panel?error=estado");
  }
}

async function guardBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { barberId: true },
  });
  if (!booking) {
    redirect("/panel?error=estado");
  }
  await requireBarberAccess(booking.barberId);
}

export async function confirmCash(bookingId: string) {
  await guardBooking(bookingId);
  finish(await confirmCashDeposit(bookingId));
}

export async function complete(bookingId: string) {
  await guardBooking(bookingId);
  finish(await closeBooking(bookingId, "COMPLETED"));
}

export async function markNoShow(bookingId: string) {
  await guardBooking(bookingId);
  finish(await closeBooking(bookingId, "NO_SHOW"));
}

export async function cancel(bookingId: string) {
  await guardBooking(bookingId);
  finish(await cancelByStaff(bookingId, new Date()));
}

export async function decide(
  bookingId: string,
  decision: "REFUND_DUE" | "RETAINED",
) {
  await guardBooking(bookingId);
  finish(await decideDeposit(bookingId, decision));
}

export async function refundDone(bookingId: string) {
  await guardBooking(bookingId);
  finish(await markDepositRefunded(bookingId));
}

export async function paymentRefundDone(paymentId: string) {
  const payment = await prisma.payment.findUniqueOrThrow({
    where: { id: paymentId },
    select: { bookingId: true },
  });
  await guardBooking(payment.bookingId);
  await clearPaymentRefund(paymentId);
  refresh();
}

export async function reschedule(bookingId: string, form: FormData) {
  await guardBooking(bookingId);

  const minutes = clockToMinutes(text(form, "time"));
  const date = text(form, "date");
  if (minutes === null || !date) {
    redirect("/panel?error=horario");
  }

  const result = await rescheduleBooking(
    bookingId,
    toInstant(date, minutes),
    new Date(),
  );
  refresh();
  if (!result.ok) {
    redirect("/panel?error=horario");
  }
}

export async function createManual(barberId: string, form: FormData) {
  await requireBarberAccess(barberId);

  const minutes = clockToMinutes(text(form, "time"));
  const date = text(form, "date");
  const clientName = text(form, "clientName");
  const clientPhone = text(form, "clientPhone");
  const serviceIds = form.getAll("serviceId").map(String);
  const back = `/panel/nuevo?barbero=${barberId}`;
  if (minutes === null || !date || !clientName || !clientPhone) {
    redirect(`${back}&error=datos`);
  }

  const start = toInstant(date, minutes);
  const result = await createManualBooking({
    barberId,
    clientName,
    clientPhone,
    serviceIds,
    start,
    depositPaid: form.get("depositPaid") === "on",
    now: new Date(),
  });
  if (!result.ok) {
    redirect(`${back}&error=${result.error}`);
  }

  refresh();
  redirect(`/panel?barbero=${barberId}&fecha=${date}`);
}

const serviceInput = z.object({
  name: z.string().trim().min(1),
  price: z.coerce.number().int().positive(),
  blocks: z.coerce.number().int().min(1).max(4),
});

function parseService(form: FormData) {
  return serviceInput.safeParse({
    name: form.get("name"),
    price: form.get("price"),
    blocks: form.get("blocks"),
  });
}

export async function addService(barberId: string, form: FormData) {
  await requireBarberAccess(barberId);

  const parsed = parseService(form);
  if (!parsed.success) {
    redirect(`/panel/servicios?barbero=${barberId}&error=datos`);
  }
  await prisma.service.create({ data: { ...parsed.data, barberId } });
  refresh();
}

export async function updateService(
  barberId: string,
  serviceId: string,
  form: FormData,
) {
  await requireBarberAccess(barberId);

  const parsed = parseService(form);
  if (!parsed.success) {
    redirect(`/panel/servicios?barbero=${barberId}&error=datos`);
  }
  await prisma.service.updateMany({
    where: { id: serviceId, barberId },
    data: { ...parsed.data, active: form.get("active") === "on" },
  });
  refresh();
}

export async function saveSchedule(barberId: string, form: FormData) {
  await requireBarberAccess(barberId);

  const back = `/panel/horarios?barbero=${barberId}`;
  const periods: {
    barberId: string;
    weekday: number;
    startMinutes: number;
    endMinutes: number;
  }[] = [];

  for (let weekday = 0; weekday < 7; weekday += 1) {
    if (form.get(`works-${weekday}`) !== "on") {
      continue;
    }

    let previousEnd = 0;
    for (const part of ["a", "b"]) {
      const startClock = text(form, `${part}-start-${weekday}`);
      const endClock = text(form, `${part}-end-${weekday}`);
      if (!startClock && !endClock) {
        continue;
      }

      const startMinutes = clockToMinutes(startClock);
      const endMinutes = clockToMinutes(endClock);
      if (
        startMinutes === null ||
        endMinutes === null ||
        startMinutes >= endMinutes ||
        startMinutes < previousEnd
      ) {
        redirect(`${back}&error=horario`);
      }

      previousEnd = endMinutes;
      periods.push({ barberId, weekday, startMinutes, endMinutes });
    }
  }

  await prisma.$transaction([
    prisma.workPeriod.deleteMany({ where: { barberId } }),
    prisma.workPeriod.createMany({ data: periods }),
  ]);
  refresh();
  redirect(`${back}&guardado=1`);
}

export async function addTimeOff(barberId: string, form: FormData) {
  await requireBarberAccess(barberId);

  const back = `/panel/bloqueos?barbero=${barberId}`;
  const startMinutes = clockToMinutes(text(form, "startTime"));
  const endMinutes = clockToMinutes(text(form, "endTime"));
  const startDate = text(form, "startDate");
  const endDate = text(form, "endDate");
  if (startMinutes === null || endMinutes === null || !startDate || !endDate) {
    redirect(`${back}&error=datos`);
  }

  const startsAt = toInstant(startDate, startMinutes);
  const endsAt = toInstant(endDate, endMinutes);
  if (startsAt >= endsAt) {
    redirect(`${back}&error=datos`);
  }
  if (await hasBookingsBetween(barberId, startsAt, endsAt, new Date())) {
    redirect(`${back}&error=turnos`);
  }

  await prisma.timeOff.create({
    data: {
      barberId,
      startsAt,
      endsAt,
      reason: text(form, "reason") || null,
    },
  });
  refresh();
}

export async function removeTimeOff(barberId: string, timeOffId: string) {
  await requireBarberAccess(barberId);
  await prisma.timeOff.deleteMany({ where: { id: timeOffId, barberId } });
  refresh();
}

export async function saveProfile(barberId: string, form: FormData) {
  await requireBarberAccess(barberId);

  const displayName = text(form, "displayName");
  if (!displayName) {
    redirect(`/panel/perfil?barbero=${barberId}&error=datos`);
  }
  await prisma.barber.update({
    where: { id: barberId },
    data: {
      displayName,
      bio: text(form, "bio") || null,
      active: form.get("active") === "on",
    },
  });
  refresh();
  redirect(`/panel/perfil?barbero=${barberId}&guardado=1`);
}

const staffInput = z.object({
  name: z.string().trim().min(1),
  email: z.email(),
  password: z.string().min(10),
});

export async function createStaff(form: FormData) {
  await requireAdmin();

  const parsed = staffInput.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) {
    redirect("/panel/equipo?error=datos");
  }

  const isAdmin = form.get("isAdmin") === "on";
  const isBarber = form.get("isBarber") === "on";
  if (!isAdmin && !isBarber) {
    redirect("/panel/equipo?error=rol");
  }
  if (isAdmin && (await prisma.user.count({ where: { isAdmin: true } })) >= MAX_ADMINS) {
    redirect("/panel/equipo?error=limite");
  }

  const { name, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) {
    redirect("/panel/equipo?error=email");
  }

  const id = crypto.randomUUID();
  await prisma.user.create({
    data: {
      id,
      name,
      email,
      emailVerified: true,
      isAdmin,
      accounts: {
        create: {
          id: crypto.randomUUID(),
          accountId: id,
          providerId: "credential",
          password: await hashPassword(password),
        },
      },
      barber: isBarber ? { create: { displayName: name } } : undefined,
    },
  });
  refresh();
  redirect("/panel/equipo?guardado=1");
}
