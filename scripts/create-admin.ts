import "dotenv/config";

import { hashPassword } from "better-auth/crypto";

import { MAX_ADMINS } from "../src/lib/permissions";
import { prisma } from "../src/server/db";

/** Crea el primer administrador. Desde ahí, el resto se carga en el panel. */
async function main() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!name || !email || !password || password.length < 10) {
    throw new Error(
      "Definí ADMIN_NAME, ADMIN_EMAIL y ADMIN_PASSWORD (al menos 10 caracteres)",
    );
  }

  if ((await prisma.user.count({ where: { isAdmin: true } })) >= MAX_ADMINS) {
    throw new Error(`Ya hay ${MAX_ADMINS} administradores`);
  }
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new Error("Ya existe una cuenta con ese email");
  }

  const id = crypto.randomUUID();
  await prisma.user.create({
    data: {
      id,
      name,
      email,
      emailVerified: true,
      isAdmin: true,
      accounts: {
        create: {
          id: crypto.randomUUID(),
          accountId: id,
          providerId: "credential",
          password: await hashPassword(password),
        },
      },
      // El dueño también atiende: nace como barbero, y lo edita en su perfil.
      barber: {
        create: { displayName: name, active: false },
      },
    },
  });
  console.log(`Administrador creado: ${email}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
