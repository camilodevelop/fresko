"use client";

import { useActionState, useState } from "react";
import { ArrowDownToLine, ClipboardCheck, Trash } from "lucide-react";
import { registerMovement, type MovementState } from "@/app/admin/inventario/actions";
import { notify } from "@/lib/notify";
import { Panel } from "@/components/dashboard/ui";
import { Field } from "@/components/ui/field";
import { useFormValidation } from "@/hooks/use-form-validation";
import { first, rules } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { displayUnit, formatQty, unitFactor, type Unit } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type Ing = { id: string; name: string; unit: Unit; stock: number };

const KINDS = [
  { id: "entrada", label: "Entrada", icon: ArrowDownToLine, help: "Compra o recepción de mercancía." },
  { id: "perdida", label: "Pérdida", icon: Trash, help: "Producto vencido, dañado o descartado." },
  { id: "ajuste", label: "Conteo", icon: ClipboardCheck, help: "Escribe lo que contaste; se ajusta la diferencia." },
] as const;

export function MovementForm({ ingredients, defaultIngredient }: { ingredients: Ing[]; defaultIngredient?: string }) {
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("entrada");
  const [ingredientId, setIngredientId] = useState(defaultIngredient ?? "");
  const ing = ingredients.find((i) => i.id === ingredientId);
  const unit = ing ? displayUnit(ing.unit) : "";

  const v = useFormValidation(
    (f) => {
      const qty = Number(String(f.quantity ?? "").replace(",", "."));
      const stockDisplay = ing ? ing.stock / unitFactor(ing.unit) : 0;
      return {
        ingredient_id: rules.required(f.ingredient_id, "Elige el ingrediente."),
        quantity:
          kind === "ajuste"
            ? first(rules.required(f.quantity, "Escribe la cantidad que contaste."), rules.range(f.quantity, 0, 1e9, "No puede ser negativa."))
            : first(
                rules.required(f.quantity, "Escribe la cantidad."),
                rules.positive(f.quantity, "Debe ser mayor a 0."),
                kind === "perdida" && ing && qty > stockDisplay
                  ? `Supera el stock actual (${formatQty(ing.stock, ing.unit)}). Usa un conteo.`
                  : null
              ),
        reason: kind === "perdida" ? rules.required(f.reason, "Elige el motivo.") : null,
        total_cost: kind === "entrada" && String(f.total_cost ?? "").trim() ? rules.money(f.total_cost) : null,
      };
    },
    undefined,
    "movement"
  );

  const [, action, pending] = useActionState<MovementState, FormData>(async (prev, data) => {
    const r = await registerMovement(prev, data);
    if (notify(r) && r.ok) {
      v.resetForm();
      setIngredientId("");
    }
    return r;
  }, {});

  return (
    <Panel title="Registrar movimiento" description={KINDS.find((k) => k.id === kind)?.help}>
      <form action={action} {...v.formProps()} className="space-y-4">
        <input type="hidden" name="kind" value={kind} />
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-[#F8F7F2] p-1">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => {
                setKind(k.id);
                v.reset();
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors",
                kind === k.id ? "bg-white text-[#1F4D36] shadow-sm" : "text-[#1B1B1B]/50 hover:text-[#1F4D36]"
              )}
            >
              <k.icon className="h-3.5 w-3.5" /> {k.label}
            </button>
          ))}
        </div>

        <Field
          label="Ingrediente"
          name={v.idFor("ingredient_id")}
          error={v.error("ingredient_id")}
          hint={ing ? `Stock actual: ${formatQty(ing.stock, ing.unit)}` : undefined}
        >
          <select
            {...v.field("ingredient_id")}
            value={ingredientId}
            onChange={(e) => setIngredientId(e.target.value)}
            className="h-11 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-3 text-sm"
          >
            <option value="">Elige…</option>
            {ingredients.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={kind === "ajuste" ? "Cantidad contada" : "Cantidad"} name={v.idFor("quantity")} error={v.error("quantity")}>
            <div className="relative">
              <Input {...v.field("quantity")} type="number" inputMode="decimal" step="any" className="h-11 pr-10" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#1B1B1B]/40">{unit}</span>
            </div>
          </Field>
          {kind === "entrada" && (
            <Field label="Costo total" optional name={v.idFor("total_cost")} error={v.error("total_cost")}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#1B1B1B]/40">$</span>
                <Input {...v.field("total_cost")} inputMode="numeric" className="h-11 pl-7" />
              </div>
            </Field>
          )}
          {kind === "perdida" && (
            <Field label="Motivo" name={v.idFor("reason")} error={v.error("reason")}>
              <select {...v.field("reason")} defaultValue="" className="h-11 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-3 text-sm">
                <option value="" disabled>Elige…</option>
                <option value="caducidad">Caducidad / vencido</option>
                <option value="dano">Daño</option>
                <option value="otro">Otro</option>
              </select>
            </Field>
          )}
        </div>
        {kind === "entrada" && (
          <p className="-mt-2 text-xs text-[#1B1B1B]/45">Si pones el costo, se actualiza el costo promedio del ingrediente y de las recetas.</p>
        )}

        <Field label="Nota" optional name={v.idFor("note")}>
          <Input {...v.field("note")} maxLength={300} className="h-11" placeholder={kind === "entrada" ? "Proveedor, factura…" : "Detalle"} />
        </Field>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Guardando…" : "Registrar"}
        </Button>
      </form>
    </Panel>
  );
}
