"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveSettings, type ActionState } from "@/app/admin/catalogo/actions";
import { notify } from "@/lib/notify";
import { Panel, fieldLabelClass } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFormValidation } from "@/hooks/use-form-validation";
import { rules } from "@/lib/validation";
import type { PricingSettings } from "@/lib/pricing";
import { formatPrice } from "@/lib/utils";

export function SettingsForm({ settings }: { settings: PricingSettings }) {
  const v = useFormValidation(
    (f) => ({ target_margin: rules.range(f.target_margin, 0, 94, "El margen debe estar entre 0% y 94%.") }),
    undefined,
    "pricing"
  );
  const [, action, pending] = useActionState<ActionState, FormData>(async (prev, data) => {
    const r = await saveSettings(prev, data);
    notify(r);
    return r;
  }, {});

  return (
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <form action={action} {...v.formProps()}>
        <Panel title="Precio sugerido" description="Cómo el sistema propone el precio de venta a partir del costo de la receta.">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Margen objetivo" name={v.idFor("target_margin")} error={v.error("target_margin")}>
                <div className="relative">
                  <Input {...v.field("target_margin")} type="number" inputMode="numeric" step="1" defaultValue={Math.round(settings.targetMargin * 100)} className="h-11 pr-8" />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#1B1B1B]/40">%</span>
                </div>
              </Field>
              <label className={fieldLabelClass}>
                Redondear a
                <select name="price_rounding" defaultValue={settings.rounding} className="mt-1.5 h-11 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-3 text-sm">
                  {[1, 10, 50, 100, 500, 1000].map((v) => (
                    <option key={v} value={v}>{formatPrice(v)}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className="rounded-2xl bg-[#F8F7F2] p-4 text-xs leading-relaxed text-[#1B1B1B]/55">
              Precio sugerido = costo ÷ (1 − margen). Con 65%, un plato que cuesta $7.000 se sugiere en $20.000: el costo es el 35% del
              precio. Cada producto puede tener su propio margen y el precio final siempre lo decides tú.
            </p>
            <div className="flex items-center gap-4">
              <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</Button>
            </div>
          </div>
        </Panel>
      </form>

      <Panel title="Planes de suscripción" description="El valor base por porción y los descuentos se configuran en Planes.">
        <p className="text-sm text-[#1B1B1B]/60">
          Cada porción de un plan cuenta el precio del plato elegido (mínimo el valor base) y al total se le aplica el descuento del plan.
        </p>
        <Link href="/admin/ajustes-venta/planes" className="mt-3 inline-block text-sm font-semibold text-[#1F4D36] underline">
          Ir a Planes
        </Link>
      </Panel>
    </div>
  );
}
