import { notFound, redirect } from "next/navigation";

import { mutedClass } from "@/components/ui";
import { MAX_BOOKING_DAYS_AHEAD } from "@/lib/booking/rules";
import { nextDays } from "@/lib/format";
import { prisma } from "@/server/db";
import { getCurrentUser } from "@/server/session";

import { BookingForm } from "./booking-form";

export default async function ReservePage({
  params,
}: {
  params: Promise<{ barberId: string }>;
}) {
  const { barberId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/entrar?next=/reservar/${barberId}`);
  }

  const barber = await prisma.barber.findFirst({
    where: { id: barberId, active: true },
    include: {
      services: { where: { active: true }, orderBy: { name: "asc" } },
    },
  });
  if (!barber) {
    notFound();
  }

  return (
    <>
      <section className="flex flex-col gap-1 pt-4">
        <h1 className="text-2xl font-semibold tracking-tight">{barber.displayName}</h1>
        <p className={mutedClass}>Podés sumar más de un servicio en el mismo turno.</p>
      </section>
      <BookingForm
        barberId={barber.id}
        services={barber.services.map(({ id, name, price, blocks }) => ({
          id,
          name,
          price,
          blocks,
        }))}
        days={nextDays(new Date(), MAX_BOOKING_DAYS_AHEAD + 1)}
        initialPhone={user.phone ?? ""}
      />
    </>
  );
}
