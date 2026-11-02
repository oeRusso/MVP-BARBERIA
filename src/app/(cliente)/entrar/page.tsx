import { mutedClass } from "@/components/ui";

import { GoogleButton } from "./google-button";

function safePath(next: string | undefined) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/mis-turnos";
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <section className="flex flex-col gap-4 pt-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Entrá para reservar</h1>
        <p className={mutedClass}>
          Usamos tu cuenta de Google para que puedas ver y cancelar tus turnos.
        </p>
      </div>
      <GoogleButton callbackURL={safePath(next)} />
    </section>
  );
}
