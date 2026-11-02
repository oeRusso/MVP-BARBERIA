import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { prisma } from "./db";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "mysql" }),
  // Los clientes entran con Google; barberos y administradores tienen
  // cuentas creadas por el sistema, sin registro público.
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },
  user: {
    additionalFields: {
      phone: { type: "string", required: false, input: false },
      isAdmin: { type: "boolean", required: false, input: false },
    },
  },
  // Detrás del túnel de Cloudflare, la IP real solo llega en este encabezado.
  // Sin esto, el límite de intentos trataría a todos como un mismo visitante.
  advanced: {
    ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
  },
  plugins: [nextCookies()],
});
