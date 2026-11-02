import "dotenv/config";

import { hashPassword } from "better-auth/crypto";

import { prisma } from "../src/server/db";

const password = process.env.SEED_STAFF_PASSWORD;
if (!password) {
  throw new Error("Falta SEED_STAFF_PASSWORD");
}

const barbers = [
  { name: "Barbero Uno", email: "barbero1@barberia.test", isAdmin: true },
  { name: "Barbero Dos", email: "barbero2@barberia.test", isAdmin: false },
];
const services = [
  { name: "Corte", price: 15000, blocks: 1 },
  { name: "Barba y perfilado de cejas", price: 15000, blocks: 1 },
];
const dailyPeriods = [
  { startMinutes: 10 * 60, endMinutes: 12 * 60 },
  { startMinutes: 13 * 60, endMinutes: 22 * 60 },
];

async function seedBarber(barber: (typeof barbers)[number], hash: string) {
  const existing = await prisma.user.findUnique({
    where: { email: barber.email },
  });
  if (existing) {
    return;
  }

  const id = crypto.randomUUID();
  await prisma.user.create({
    data: {
      id,
      name: barber.name,
      email: barber.email,
      emailVerified: true,
      isAdmin: barber.isAdmin,
      accounts: {
        create: {
          id: crypto.randomUUID(),
          accountId: id,
          providerId: "credential",
          password: hash,
        },
      },
      barber: {
        create: {
          displayName: barber.name,
          services: { create: services },
          workPeriods: {
            create: [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) =>
              dailyPeriods.map((period) => ({ ...period, weekday })),
            ),
          },
        },
      },
    },
  });
}

async function main() {
  const hash = await hashPassword(password as string);
  for (const barber of barbers) {
    await seedBarber(barber, hash);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
