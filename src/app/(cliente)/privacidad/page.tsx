export const metadata = { title: "Privacidad | Chachi's Barber" };

export default function PrivacyPage() {
  return (
    <section className="flex flex-col gap-3 pt-4 text-sm leading-6">
      <h1 className="text-2xl font-semibold tracking-tight">Política de privacidad</h1>
      <p>
        Chachi&apos;s Barber usa tu nombre, email y teléfono solo para gestionar tus
        turnos y comunicarse con vos sobre ellos.
      </p>
      <p>
        Tu cuenta de Google se usa únicamente para identificarte. Los pagos se
        procesan en Mercado Pago: nunca guardamos datos de tarjetas.
      </p>
      <p>
        No vendemos ni compartimos tus datos con terceros, salvo los servicios
        necesarios para operar la reserva, el pago y los avisos por email.
      </p>
      <p>
        Podés pedir en la barbería que corrijamos o eliminemos tus datos.
      </p>
    </section>
  );
}
