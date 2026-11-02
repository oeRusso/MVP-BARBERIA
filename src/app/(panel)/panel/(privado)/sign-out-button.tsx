"use client";

import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.replace("/panel/entrar");
    router.refresh();
  }

  return (
    <button type="button" onClick={signOut} className="min-h-11 text-sm underline-offset-4 hover:underline">
      Salir
    </button>
  );
}
