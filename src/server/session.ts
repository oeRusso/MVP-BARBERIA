import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { type Actor, canManageBarber, isStaff } from "@/lib/permissions";

import { auth } from "./auth";
import { prisma } from "./db";

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function requireClient() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/entrar");
  }
  return user;
}

async function loadActor(userId: string, isAdmin: boolean): Promise<Actor> {
  const barber = await prisma.barber.findUnique({
    where: { userId },
    select: { id: true },
  });
  return { isAdmin, barberId: barber?.id ?? null };
}

export async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/panel/entrar");
  }

  const actor = await loadActor(user.id, Boolean(user.isAdmin));
  if (!isStaff(actor)) {
    redirect("/");
  }
  return { user, actor };
}

export async function requireAdmin() {
  const staff = await requireStaff();
  if (!staff.actor.isAdmin) {
    redirect("/panel");
  }
  return staff;
}

export async function requireBarberAccess(barberId: string) {
  const staff = await requireStaff();
  if (!canManageBarber(staff.actor, barberId)) {
    redirect("/panel");
  }
  return staff;
}
