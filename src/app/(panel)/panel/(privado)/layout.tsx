import Link from "next/link";

import { requireStaff } from "@/server/session";

import { SignOutButton } from "./sign-out-button";

export const metadata = { title: "Panel | Chachi's Barber" };
export const dynamic = "force-dynamic";

const links = [
  { href: "/panel", label: "Agenda" },
  { href: "/panel/nuevo", label: "Cargar turno" },
  { href: "/panel/servicios", label: "Servicios" },
  { href: "/panel/horarios", label: "Horarios" },
  { href: "/panel/bloqueos", label: "Bloqueos" },
  { href: "/panel/perfil", label: "Perfil" },
];

export default async function PanelLayout({ children }: LayoutProps<"/">) {
  const { actor } = await requireStaff();
  const items = actor.isAdmin
    ? [...links, { href: "/panel/equipo", label: "Equipo" }]
    : links;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4">
      <header className="flex min-h-16 items-center justify-between">
        <Link href="/panel" className="font-semibold tracking-tight">
          Chachi&apos;s Barber
        </Link>
        <SignOutButton />
      </header>
      <nav aria-label="Panel" className="-mx-4 overflow-x-auto px-4 pb-3">
        <ul className="flex gap-4 whitespace-nowrap text-sm">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex flex-1 flex-col gap-6 pb-10 pt-2">{children}</main>
    </div>
  );
}
