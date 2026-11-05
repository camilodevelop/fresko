"use client";

import { useActionState, useOptimistic, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { createCity, createCountry, setActive, type FormState } from "./actions";

const selectClass =
  "h-11 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-4 text-sm text-[#1B1B1B]";

export function CountryForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createCountry, {});
  return (
    <form action={action} className="space-y-3">
      <Input name="name" placeholder="País (ej. México)" required className="h-11" />
      <div className="grid grid-cols-2 gap-2">
        <Input name="code" placeholder="Código (MX)" maxLength={2} required className="h-11" />
        <Input name="currency" placeholder="Moneda (MXN)" maxLength={3} required className="h-11" />
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <Button type="submit" size="sm" variant="secondary" disabled={pending} className="w-full">Agregar país</Button>
    </form>
  );
}

export function CityForm({ countries }: { countries: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createCity, {});
  return (
    <form action={action} className="space-y-3">
      <select name="country_id" className={selectClass} required defaultValue="">
        <option value="" disabled>País</option>
        {countries.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <Input name="name" placeholder="Ciudad (ej. Medellín)" required className="h-11" />
      <Input name="timezone" placeholder="Zona horaria" defaultValue="America/Bogota" className="h-11" />
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <Button type="submit" size="sm" variant="secondary" disabled={pending} className="w-full">Agregar ciudad</Button>
    </form>
  );
}

export function ActiveToggle({
  table,
  id,
  active,
}: {
  table: "countries" | "cities" | "zones";
  id: string;
  active: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(active);
  const [pending, startTransition] = useTransition();
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-[#1B1B1B]/50">
      {optimistic ? "Activo" : "Inactivo"}
      <Switch
        size="sm"
        label="Activo"
        checked={optimistic}
        disabled={pending}
        onChange={(next) =>
          startTransition(async () => {
            setOptimistic(next);
            await setActive(table, id, next);
          })
        }
      />
    </label>
  );
}
