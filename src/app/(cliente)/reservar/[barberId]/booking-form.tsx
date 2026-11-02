"use client";

import { useState, useTransition } from "react";

import {
  buttonClass,
  cardClass,
  inputClass,
  mutedClass,
  noticeClass,
  secondaryButtonClass,
} from "@/components/ui";
import { bookingTotals } from "@/lib/booking/deposit";
import { formatMoney } from "@/lib/format";

import { loadSlots, reserve, type Slot } from "../../actions";

type Service = {
  id: string;
  name: string;
  price: number;
  blocks: number;
};

type BookingFormProps = {
  barberId: string;
  services: Service[];
  days: { date: string; label: string }[];
  initialPhone: string;
};

type Method = "MERCADO_PAGO" | "CASH";

export function BookingForm({
  barberId,
  services,
  days,
  initialPhone,
}: BookingFormProps) {
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [method, setMethod] = useState<Method>("MERCADO_PAGO");
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [submitting, startSubmitting] = useTransition();

  const selected = services.filter(({ id }) => serviceIds.includes(id));
  const totals = selected.length > 0 ? bookingTotals(selected) : null;

  function refreshSlots(nextDate: string | null, nextServiceIds: string[]) {
    setSlot(null);
    setSlots(null);
    if (!nextDate || nextServiceIds.length === 0) {
      return;
    }
    startLoading(async () => {
      setSlots(
        await loadSlots({
          barberId,
          date: nextDate,
          serviceIds: nextServiceIds,
        }),
      );
    });
  }

  function toggleService(id: string) {
    const next = serviceIds.includes(id)
      ? serviceIds.filter((current) => current !== id)
      : [...serviceIds, id];
    setServiceIds(next);
    refreshSlots(date, next);
  }

  function chooseDate(next: string) {
    setDate(next);
    refreshSlots(next, serviceIds);
  }

  function chooseSlot(next: Slot) {
    setSlot(next);
    if (!next.cashAvailable) {
      setMethod("MERCADO_PAGO");
    }
  }

  function submit() {
    if (!slot) {
      return;
    }
    setError(null);
    startSubmitting(async () => {
      const result = await reserve({
        barberId,
        serviceIds,
        start: slot.start,
        method,
        phone,
      });
      setError(result.error);
      if (date) {
        refreshSlots(date, serviceIds);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">1. Servicios</legend>
        {services.map((service) => (
          <label key={service.id} className={`${cardClass} flex min-h-11 items-center gap-3`}>
            <input
              type="checkbox"
              checked={serviceIds.includes(service.id)}
              onChange={() => toggleService(service.id)}
              className="size-5"
            />
            <span className="flex-1">{service.name}</span>
            <span className={mutedClass}>{formatMoney(service.price)}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">2. Día</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {days.map((day) => (
            <button
              key={day.date}
              type="button"
              aria-pressed={date === day.date}
              onClick={() => chooseDate(day.date)}
              className={date === day.date ? buttonClass : secondaryButtonClass}
            >
              {day.label}
            </button>
          ))}
        </div>
      </fieldset>

      {serviceIds.length > 0 && date && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-medium">3. Horario</legend>
          {loading && <p className={mutedClass}>Buscando horarios...</p>}
          {slots?.length === 0 && (
            <p className={mutedClass}>No hay horarios libres ese día.</p>
          )}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots?.map((option) => (
              <button
                key={option.start}
                type="button"
                aria-pressed={slot?.start === option.start}
                onClick={() => chooseSlot(option)}
                className={
                  slot?.start === option.start ? buttonClass : secondaryButtonClass
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {slot && totals && (
        <section className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-medium">4. Seña</legend>
            <label className={`${cardClass} flex min-h-11 items-center gap-3`}>
              <input
                type="radio"
                name="method"
                checked={method === "MERCADO_PAGO"}
                onChange={() => setMethod("MERCADO_PAGO")}
                className="size-5"
              />
              Mercado Pago
            </label>
            <label className={`${cardClass} flex min-h-11 items-center gap-3`}>
              <input
                type="radio"
                name="method"
                checked={method === "CASH"}
                disabled={!slot.cashAvailable}
                onChange={() => setMethod("CASH")}
                className="size-5"
              />
              <span>
                Efectivo en el local
                {!slot.cashAvailable && (
                  <span className={`${mutedClass} block`}>
                    Solo para turnos a 3 horas o más
                  </span>
                )}
              </span>
            </label>
          </fieldset>

          <label className="flex flex-col gap-1 font-medium">
            Teléfono
            <input
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className={inputClass}
            />
          </label>

          <dl className={`${noticeClass} flex flex-col gap-1`}>
            <div className="flex justify-between">
              <dt>Total</dt>
              <dd>{formatMoney(totals.price)}</dd>
            </div>
            <div className="flex justify-between font-medium">
              <dt>Seña (40%)</dt>
              <dd>{formatMoney(totals.deposit)}</dd>
            </div>
          </dl>

          {error && (
            <p role="alert" className={noticeClass}>
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={submitting || phone.trim() === ""}
            className={buttonClass}
          >
            {submitting ? "Reservando..." : "Reservar turno"}
          </button>
        </section>
      )}
    </div>
  );
}
