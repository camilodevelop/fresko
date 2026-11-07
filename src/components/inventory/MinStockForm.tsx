"use client";

import { useState, useTransition } from "react";
import { setKitchenMin } from "@/app/admin/inventario/actions";
import { Panel } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/notify";
import { displayUnit, unitFactor, type Unit } from "@/lib/pricing";

/** Mínimo del ingrediente en esta cocina: bajo él, el equipo de la cocina recibe la alerta. */
export function MinStockForm({ kitchenId, ingredientId, name, unit, current }: { kitchenId: string; ingredientId: string; name: string; unit: Unit; current: number }) {
  const [value, setValue] = useState(String(Math.round((current / unitFactor(unit)) * 100) / 100));
  const [pending, start] = useTransition();
  const n = Number(value.replace(",", "."));
  return (
    <Panel title={`Mínimo · ${name}`} description="Si el stock de esta cocina baja de aquí, avisamos a su equipo.">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => void notify(await setKitchenMin(kitchenId, ingredientId, n)));
        }}
      >
        <div className="relative flex-1">
          <Input value={value} onChange={(e) => setValue(e.target.value)} type="number" inputMode="decimal" step="any" min={0} className="h-11 pr-10" aria-label="Mínimo" />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#1B1B1B]/40">{displayUnit(unit)}</span>
        </div>
        <Button type="submit" disabled={pending || !Number.isFinite(n) || n < 0}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </form>
    </Panel>
  );
}
