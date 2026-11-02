import { LoginForm } from "./login-form";

export const metadata = { title: "Panel | Chachi's Barber" };

export default function PanelSignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-semibold tracking-tight">Panel de barberos</h1>
      <LoginForm />
    </main>
  );
}
