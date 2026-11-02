import { buttonClass, inputClass, mutedClass, noticeClass } from "@/components/ui";
import { prisma } from "@/server/db";
import { selectedBarber } from "@/server/panel";
import { requireStaff } from "@/server/session";

import { saveProfile } from "../actions";
import { BarberPicker } from "../barber-picker";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ barbero?: string; error?: string; guardado?: string }>;
}) {
  const { barbero, error, guardado } = await searchParams;
  const { actor } = await requireStaff();
  const { barbers, selected } = await selectedBarber(actor, barbero);
  if (!selected) {
    return <p className={mutedClass}>Todavía no hay barberos cargados.</p>;
  }

  const profile = await prisma.barber.findUniqueOrThrow({
    where: { id: selected.id },
  });

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
      <BarberPicker
        barbers={barbers}
        selectedId={selected.id}
        href={(id) => `/panel/perfil?barbero=${id}`}
      />
      {error && (
        <p role="alert" className={noticeClass}>
          El nombre no puede quedar vacío.
        </p>
      )}
      {guardado && <p className={noticeClass}>Perfil guardado.</p>}

      <form action={saveProfile.bind(null, selected.id)} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Nombre visible
          <input
            name="displayName"
            required
            defaultValue={profile.displayName}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Presentación
          <textarea
            name="bio"
            rows={3}
            defaultValue={profile.bio ?? ""}
            className={`${inputClass} py-2`}
          />
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            name="active"
            defaultChecked={profile.active}
            className="size-5"
          />
          Visible para reservas
        </label>
        <button className={buttonClass}>Guardar</button>
      </form>
    </section>
  );
}
