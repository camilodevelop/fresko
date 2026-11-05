"use client";

import { useActionState, useOptimistic, useTransition } from "react";
import { Field } from "@/components/ui/field";
import { useFormValidation } from "@/hooks/use-form-validation";
import { first, rules } from "@/lib/validation";
import { notify } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { createCity, createCountry, setActive, type FormState } from "./actions";

const selectClass =
  "h-11 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-4 text-sm text-[#1B1B1B]";

export function CountryForm() {
  const v = useFormValidation(
    (f) => ({
      name: rules.required(f.name, "Escribe el nombre del país."),
      code: first(rules.required(f.code, "Escribe el código."), rules.pattern(f.code, /^[A-Za-z]{2}$/, "Usa 2 letras (ej. CO, MX).")),
      currency: first(rules.required(f.currency, "Escribe la moneda."), rules.pattern(f.currency, /^[A-Za-z]{3}$/, "Usa 3 letras (ej. COP, MXN).")),
    }),
    undefined,
    "country"
  );
  const [, action, pending] = useActionState<FormState, FormData>(async (prev, data) => {
    const r = await createCountry(prev, data);
    if (notify(r)) v.resetForm();
    return r;
  }, {});
  return (
    <form action={action} {...v.formProps()} className="space-y-3">
      <Field name={v.idFor("name")} error={v.error("name")}>
        <Input {...v.field("name")} placeholder="País (ej. México)" className="h-11" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field name={v.idFor("code")} error={v.error("code")}>
          <Input {...v.field("code")} placeholder="Código (MX)" maxLength={2} className="h-11 uppercase" />
        </Field>
        <Field name={v.idFor("currency")} error={v.error("currency")}>
          <Input {...v.field("currency")} placeholder="Moneda (MXN)" maxLength={3} className="h-11 uppercase" />
        </Field>
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={pending} className="w-full">Agregar país</Button>
    </form>
  );
}

const isTimezone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("es", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export function CityForm({ countries }: { countries: { id: string; name: string }[] }) {
  const v = useFormValidation(
    (f) => ({
      country_id: rules.required(f.country_id, "Elige el país."),
      name: rules.required(f.name, "Escribe el nombre de la ciudad."),
      timezone: f.timezone && !isTimezone(String(f.timezone)) ? "Zona horaria inválida (ej. America/Bogota)." : null,
    }),
    undefined,
    "city"
  );
  const [, action, pending] = useActionState<FormState, FormData>(async (prev, data) => {
    const r = await createCity(prev, data);
    if (notify(r)) v.resetForm();
    return r;
  }, {});
  return (
    <form action={action} {...v.formProps()} className="space-y-3">
      <Field name={v.idFor("country_id")} error={v.error("country_id")}>
        <select {...v.field("country_id")} className={selectClass} defaultValue="">
          <option value="" disabled>País</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
      <Field name={v.idFor("name")} error={v.error("name")}>
        <Input {...v.field("name")} placeholder="Ciudad (ej. Medellín)" className="h-11" />
      </Field>
      <Field name={v.idFor("timezone")} error={v.error("timezone")} hint="Zona horaria para la hora de corte y las entregas.">
        <Input {...v.field("timezone")} placeholder="Zona horaria" defaultValue="America/Bogota" className="h-11" />
      </Field>
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
            notify(await setActive(table, id, next));
          })
        }
      />
    </label>
  );
}
