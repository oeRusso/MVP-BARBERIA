import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { PrismaClient } from "@/generated/prisma/client";

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Falta la variable de entorno DATABASE_URL");
  }

  const { hostname, port, username, password, pathname } = new URL(url);
  const adapter = new PrismaMariaDb({
    host: hostname,
    port: Number(port || 3306),
    user: decodeURIComponent(username),
    password: decodeURIComponent(password),
    database: pathname.slice(1),
    connectionLimit: 10,
    allowPublicKeyRetrieval: true,
  });

  return new PrismaClient({ adapter });
}

// Reutiliza el cliente entre recargas de desarrollo para no agotar conexiones.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
