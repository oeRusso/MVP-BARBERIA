import Link from "next/link";

import { buttonClass, secondaryButtonClass } from "@/components/ui";

type BarberPickerProps = {
  barbers: { id: string; displayName: string }[];
  selectedId: string;
  /** Ruta base, con sus otros parámetros si los tiene. */
  href: (barberId: string) => string;
};

export function BarberPicker({ barbers, selectedId, href }: BarberPickerProps) {
  if (barbers.length < 2) {
    return null;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {barbers.map((barber) => (
        <li key={barber.id}>
          <Link
            href={href(barber.id)}
            aria-current={barber.id === selectedId ? "true" : undefined}
            className={
              barber.id === selectedId ? buttonClass : secondaryButtonClass
            }
          >
            {barber.displayName}
          </Link>
        </li>
      ))}
    </ul>
  );
}
