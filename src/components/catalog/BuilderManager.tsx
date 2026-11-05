"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { Check, Plus } from "lucide-react";
import { saveBuilderOption, type BuilderOptionInput } from "@/app/admin/catalogo/actions";
import { Panel } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFormValidation } from "@/hooks/use-form-validation";
import { first, rules } from "@/lib/validation";
import { Switch } from "@/components/ui/switch";
import { suggestedPrice, type PricingSettings, type Unit } from "@/lib/pricing";
import { notify } from "@/lib/notify";
import { cn, formatPrice } from "@/lib/utils";

type Ing = { id: string; name: string; unit: Unit; cost_per_unit: number; image: string | null };
type Step = BuilderOptionInput["step"];

const STEP_LABEL: Record<Step, string> = {
  base: "Base",
  vegetables: "Vegetales",
  proteins: "Proteínas",
  toppings: "Toppings",
  sauce: "Salsas",
};


function OptionRow({
  initial,
  ingredients,
  settings,
  taken,
}: {
  initial: BuilderOptionInput;
  ingredients: Ing[];
  settings: PricingSettings;
  /** Nombres ya usados en este paso (en minúscula). */
  taken: string[];
}) {
  const rowId = useId().replace(/:/g, "");
  const [o, setO] = useState(initial);
  const [dirty, setDirty] = useState(!initial.id);
  const [pending, start] = useTransition();
  const ing = ingredients.find((i) => i.id === o.ingredientId);
  const cost = ing ? Math.round(o.quantity * ing.cost_per_unit) : 0;
  const suggested = suggestedPrice(cost, settings.targetMargin, settings.rounding);

  const set = (patch: Partial<BuilderOptionInput>) => {
    setO((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const v = useFormValidation(
    () => ({
      name: first(
        rules.required(o.name, "Escribe el nombre."),
        taken.includes(o.name.trim().toLowerCase()) ? "Ya hay una opción con ese nombre en este paso." : null
      ),
      quantity: o.ingredientId && !(o.quantity > 0) ? "Escribe la cantidad del ingrediente." : o.quantity < 0 ? "No puede ser negativa." : null,
      price: o.price < 0 ? "No puede ser negativo." : null,
    }),
    () => o,
    `opt-${rowId}`
  );

  const save = () =>
    start(async () => {
      const r = await saveBuilderOption(o);
      notify(r);
      if (r.ok) setDirty(false);
    });

  return (
    <form
      {...v.formProps(() => dirty && save())}
      className={cn(
        "grid grid-cols-6 items-start gap-2 rounded-2xl p-2 max-md:border max-md:border-[#1F4D36]/[0.07] md:grid-cols-[44px_1fr_1fr_100px_130px_auto]",
        !o.active && "opacity-55",
        dirty && "bg-[#FFFBEB]"
      )}
    >
      <div className="col-span-1 flex items-center gap-1">
        <input
          aria-label="Emoji"
          className="h-10 w-11 rounded-xl border border-[#1F4D36]/15 bg-white text-center text-lg"
          value={o.emoji}
          maxLength={4}
          onChange={(e) => set({ emoji: e.target.value })}
        />
      </div>
      <div className="col-span-5 flex items-center gap-2 md:col-span-1">
        <span
          className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-[#F4F8F2]"
          title={ing?.image ? "Foto del ingrediente" : "Sin foto: se muestra el emoji. Súbela en Catálogo → Ingredientes."}
        >
          {ing?.image ? (
            <Image src={ing.image} alt="" fill sizes="40px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg">{o.emoji}</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <Input {...v.field("name")} aria-label="Nombre" className="h-10" value={o.name} onChange={(e) => set({ name: e.target.value })} placeholder="Nombre" />
          <FieldError name={v.idFor("name")} error={v.error("name")} />
        </div>
      </div>
      <select
        aria-label="Ingrediente"
        className="col-span-6 h-10 rounded-xl border border-[#1F4D36]/15 bg-white px-3 text-sm md:col-span-1"
        value={o.ingredientId ?? ""}
        onChange={(e) => set({ ingredientId: e.target.value || null })}
      >
        <option value="">Sin ingrediente</option>
        {ingredients.map((i) => (
          <option key={i.id} value={i.id}>{i.name}</option>
        ))}
      </select>
      <div className="col-span-3 md:col-span-1">
        <div className="relative">
          <Input
            {...v.field("quantity")}
            type="number"
            inputMode="decimal"
            step="any"
            className="h-10 pr-9"
            value={o.quantity || ""}
            onChange={(e) => set({ quantity: Number(e.target.value) })}
            aria-label="Cantidad"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#1B1B1B]/40">{ing?.unit ?? ""}</span>
        </div>
        <FieldError name={v.idFor("quantity")} error={v.error("quantity")} />
      </div>
      <div className="col-span-3 md:col-span-1">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#1B1B1B]/40">+$</span>
          <Input
            {...v.field("price")}
            inputMode="numeric"
            className="h-10 pl-8"
            value={o.price || ""}
            placeholder="0"
            onChange={(e) => set({ price: Number(e.target.value.replace(/\D/g, "") || 0) })}
            aria-label="Valor extra"
          />
        </div>
        {cost > 0 && (
          <button
            type="button"
            onClick={() => set({ price: suggested })}
            className="mt-0.5 text-[11px] text-[#1B1B1B]/45 hover:text-[#1F4D36]"
            title="Usar el valor sugerido según el costo y el margen objetivo"
          >
            costo {formatPrice(cost)} · sug. {formatPrice(suggested)}
          </button>
        )}
      </div>
      <div className="col-span-6 flex items-center justify-end gap-2 md:col-span-1">
        <span className="mr-auto text-xs text-[#1B1B1B]/45 md:hidden">{o.active ? "Activa" : "Inactiva"}</span>
        <Switch size="sm" label="Activa" checked={o.active} onChange={(v) => set({ active: v })} />
        <Button size="sm" type="submit" variant={dirty ? "default" : "ghost"} disabled={pending || !dirty}>
          {dirty ? "Guardar" : <Check className="h-4 w-4" />}
        </Button>
      </div>
    </form>
  );
}

export function BuilderManager({
  options,
  ingredients,
  settings,
}: {
  options: BuilderOptionInput[];
  ingredients: Ing[];
  settings: PricingSettings;
}) {
  const [drafts, setDrafts] = useState<Record<Step, number>>({ base: 0, vegetables: 0, proteins: 0, toppings: 0, sauce: 0 });

  return (
    <div className="space-y-6">
      <Panel>
        <p className="text-sm text-[#1B1B1B]/60">
          Estas opciones se usan en todos los productos de tipo <strong>Armador</strong> (Arma tu bowl, Arma tu ensalada…). El precio
          final es el <strong>precio del producto</strong> más el valor extra de cada opción que elija el cliente, y cada opción descontará
          su ingrediente del inventario. La vista previa del bowl usa la <strong>foto de cada ingrediente</strong> (se cambia en{" "}
          <Link href="/admin/catalogo/ingredientes" className="font-semibold text-[#1F4D36] underline">Ingredientes</Link>). El precio
          base se cambia en la ficha de cada producto, en{" "}
          <Link href="/admin/catalogo" className="font-semibold text-[#1F4D36] underline">Productos</Link>.
        </p>
      </Panel>
      {(Object.keys(STEP_LABEL) as Step[]).map((step) => {
        const list = options.filter((o) => o.step === step);
        return (
          <Panel
            key={step}
            title={STEP_LABEL[step]}
            description={`${list.length} opciones`}
            actions={
              <Button size="sm" variant="secondary" type="button" onClick={() => setDrafts((d) => ({ ...d, [step]: d[step] + 1 }))}>
                <Plus className="h-4 w-4" /> Opción
              </Button>
            }
          >
            <div className="hidden grid-cols-[44px_1fr_1fr_100px_130px_auto] gap-2 px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#1B1B1B]/40 md:grid">
              <span />
              <span>Foto y nombre</span>
              <span>Ingrediente</span>
              <span>Cantidad</span>
              <span>Valor extra</span>
              <span />
            </div>
            <div className="space-y-2 md:space-y-1">
              {list.map((o) => (
                <OptionRow
                  key={o.id}
                  initial={o}
                  ingredients={ingredients}
                  settings={settings}
                  taken={list.filter((x) => x.id !== o.id).map((x) => x.name.trim().toLowerCase())}
                />
              ))}
              {Array.from({ length: drafts[step] }, (_, i) => (
                <OptionRow
                  key={`draft-${i}`}
                  taken={list.map((x) => x.name.trim().toLowerCase())}
                  ingredients={ingredients}
                  settings={settings}
                  initial={{ step, name: "", emoji: "🥗", ingredientId: null, quantity: 0, price: 0, active: true }}
                />
              ))}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
