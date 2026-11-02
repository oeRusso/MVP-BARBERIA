import {
  buttonClass,
  cardClass,
  inputClass,
  mutedClass,
  noticeClass,
  secondaryButtonClass,
} from "@/components/ui";
import { prisma } from "@/server/db";
import { selectedBarber } from "@/server/panel";
import { requireStaff } from "@/server/session";

import { addService, updateService } from "../actions";
import { BarberPicker } from "../barber-picker";

function ServiceFields({
  name = "",
  price,
  blocks = 1,
}: {
  name?: string;
  price?: number;
  blocks?: number;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_8rem_6rem]">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Nombre
        <input name="name" required defaultValue={name} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Precio ($)
        <input
          name="price"
          type="number"
          min="1"
          step="1"
          required
          defaultValue={price}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Bloques
        <input
          name="blocks"
          type="number"
          min="1"
          max="4"
          required
          defaultValue={blocks}
          className={inputClass}
        />
      </label>
    </div>
  );
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ barbero?: string; error?: string }>;
}) {
  const { barbero, error } = await searchParams;
  const { actor } = await requireStaff();
  const { barbers, selected } = await selectedBarber(actor, barbero);
  if (!selected) {
    return <p className={mutedClass}>Todavía no hay barberos cargados.</p>;
  }

  const services = await prisma.service.findMany({
    where: { barberId: selected.id },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Servicios</h1>
      <p className={mutedClass}>
        Cada bloque dura 45 minutos: 40 de servicio y 5 de preparación.
      </p>
      <BarberPicker
        barbers={barbers}
        selectedId={selected.id}
        href={(id) => `/panel/servicios?barbero=${id}`}
      />
      {error && (
        <p role="alert" className={noticeClass}>
          Revisá nombre, precio y bloques.
        </p>
      )}

      {services.map((service) => (
        <form
          key={service.id}
          action={updateService.bind(null, selected.id, service.id)}
          className={`${cardClass} flex flex-col gap-3`}
        >
          <ServiceFields
            name={service.name}
            price={service.price}
            blocks={service.blocks}
          />
          <div className="flex items-center justify-between gap-3">
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                name="active"
                defaultChecked={service.active}
                className="size-5"
              />
              Disponible
            </label>
            <button className={secondaryButtonClass}>Guardar</button>
          </div>
        </form>
      ))}

      <form
        action={addService.bind(null, selected.id)}
        className={`${cardClass} flex flex-col gap-3`}
      >
        <h2 className="font-medium">Nuevo servicio</h2>
        <ServiceFields />
        <button className={buttonClass}>Agregar</button>
      </form>
    </section>
  );
}
