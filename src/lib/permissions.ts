export const MAX_ADMINS = 3;

export type Actor = {
  isAdmin: boolean;
  /** Perfil de barbero del usuario, si lo tiene. */
  barberId: string | null;
};

export function isStaff(actor: Actor): boolean {
  return actor.isAdmin || actor.barberId !== null;
}

/** Un barbero gestiona solo su perfil y agenda; un administrador, todos. */
export function canManageBarber(actor: Actor, barberId: string): boolean {
  return actor.isAdmin || actor.barberId === barberId;
}
