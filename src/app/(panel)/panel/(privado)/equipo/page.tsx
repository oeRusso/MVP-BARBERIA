import { buttonClass, cardClass, inputClass, mutedClass, noticeClass } from "@/components/ui";
import { MAX_ADMINS } from "@/lib/permissions";
import { prisma } from "@/server/db";
import { requireAdmin } from "@/server/session";

import { createStaff } from "../actions";

const ERRORS: Record<string, string> = {
  datos: "Revisá los datos: la contraseña necesita al menos 10 caracteres.",
  rol: "Elegí al menos un rol.",
  limite: `Ya hay ${MAX_ADMINS} administradores, que es el máximo.`,
  email: "Ya existe una cuenta con ese email.",
};

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; guardado?: string }>;
}) {
  const { error, guardado } = await searchParams;
  await requireAdmin();

  const team = await prisma.user.findMany({
    where: { OR: [{ isAdmin: true }, { barber: { isNot: null } }] },
    orderBy: { name: "asc" },
    include: { barber: { select: { id: true } } },
  });
  const admins = team.filter(({ isAdmin }) => isAdmin).length;

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Equipo</h1>
      <p className={mutedClass}>
        {admins} de {MAX_ADMINS} administradores.
      </p>
      {error && ERRORS[error] && (
        <p role="alert" className={noticeClass}>
          {ERRORS[error]}
        </p>
      )}
      {guardado && <p className={noticeClass}>Cuenta creada.</p>}

      <ul className="flex flex-col gap-2">
        {team.map((member) => (
          <li key={member.id} className={`${cardClass} flex justify-between gap-4`}>
            <div>
              <p>{member.name}</p>
              <p className={mutedClass}>{member.email}</p>
            </div>
            <p className={mutedClass}>
              {[member.isAdmin && "Administrador", member.barber && "Barbero"]
                .filter(Boolean)
                .join(" y ")}
            </p>
          </li>
        ))}
      </ul>

      <form action={createStaff} className={`${cardClass} flex flex-col gap-3`}>
        <h2 className="font-medium">Nueva cuenta</h2>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Nombre
          <input name="name" required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Email
          <input name="email" type="email" required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Contraseña inicial
          <input
            name="password"
            type="password"
            minLength={10}
            autoComplete="new-password"
            required
            className={inputClass}
          />
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="isBarber" defaultChecked className="size-5" />
          Barbero
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="isAdmin" className="size-5" />
          Administrador
        </label>
        <button className={buttonClass}>Crear cuenta</button>
      </form>
    </section>
  );
}
