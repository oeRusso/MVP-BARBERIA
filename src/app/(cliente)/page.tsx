import Link from "next/link";

import { cardClass, mutedClass } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const barbers = await prisma.barber.findMany({
    where: { active: true },
    orderBy: { displayName: "asc" },
    include: {
      services: { where: { active: true }, orderBy: { name: "asc" } },
    },
  });

  return (
    <>
      <section className="flex flex-col gap-1 pt-4">
        <h1 className="text-3xl font-semibold tracking-tight">Reservá tu turno</h1>
        <p className={mutedClass}>Elegí con quién querés atenderte.</p>
      </section>

      <ul className="flex flex-col gap-3">
        {barbers.map((barber) => (
          <li key={barber.id}>
            <Link
              href={`/reservar/${barber.id}`}
              className={`${cardClass} block transition-colors hover:bg-foreground/5`}
            >
              <h2 className="text-lg font-medium">{barber.displayName}</h2>
              {barber.bio && <p className={mutedClass}>{barber.bio}</p>}
              <ul className={`${mutedClass} mt-2`}>
                {barber.services.map((service) => (
                  <li key={service.id} className="flex justify-between gap-4">
                    <span>{service.name}</span>
                    <span>{formatMoney(service.price)}</span>
                  </li>
                ))}
              </ul>
            </Link>
          </li>
        ))}
      </ul>

      {barbers.length === 0 && (
        <p className={mutedClass}>Todavía no hay barberos disponibles.</p>
      )}
    </>
  );
}
