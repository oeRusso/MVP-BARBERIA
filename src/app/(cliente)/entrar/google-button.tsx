"use client";

import { useState } from "react";

import { buttonClass } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

export function GoogleButton({ callbackURL }: { callbackURL: string }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signIn() {
    setPending(true);
    setFailed(false);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL,
    });
    if (error) {
      setPending(false);
      setFailed(true);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={signIn}
        disabled={pending}
        className={buttonClass}
      >
        {pending ? "Conectando..." : "Continuar con Google"}
      </button>
      {failed && (
        <p role="alert" className="text-sm">
          No pudimos conectar con Google. Probá de nuevo.
        </p>
      )}
    </div>
  );
}
