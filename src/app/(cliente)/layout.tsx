import Link from "next/link";

export default function ClientLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4">
      <header className="flex min-h-16 items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">
          Chachi&apos;s Barber
        </Link>
        <Link href="/mis-turnos" className="text-sm underline-offset-4 hover:underline">
          Mis turnos
        </Link>
      </header>
      <main className="flex flex-1 flex-col gap-6 pb-10">{children}</main>
      <footer className="flex justify-between py-4 text-xs text-foreground/60">
        <Link href="/privacidad">Privacidad</Link>
        <Link href="/panel">Barberos</Link>
      </footer>
    </div>
  );
}
