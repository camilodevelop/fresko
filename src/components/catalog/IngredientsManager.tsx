"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Search, X } from "lucide-react";
import { saveIngredient, type IngredientInput } from "@/app/admin/catalogo/actions";
import { Panel, StatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFormValidation } from "@/hooks/use-form-validation";
import { first, rules } from "@/lib/validation";
import { Switch } from "@/components/ui/switch";
import type { IngredientRow } from "@/lib/catalog-admin";
import {
  displayUnit,
  formatQty,
  unitFactor,
  type IngredientCategory,
  type Unit,
} from "@/lib/pricing";
import { notify } from "@/lib/notify";
import { cn, formatPrice } from "@/lib/utils";

const selectClass = "h-11 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-3 text-sm text-[#1B1B1B]";

const EMPTY: IngredientInput = {
  name: "",
  categoryId: "",
  unit: "g",
  costPerDisplayUnit: 0,
  minStockDisplay: 0,
  active: true,
};

function toInput(i: IngredientRow): IngredientInput {
  const f = unitFactor(i.unit);
  return {
    id: i.id,
    name: i.name,
    categoryId: i.category,
    unit: i.unit,
    costPerDisplayUnit: Math.round(i.cost_per_unit * f),
    minStockDisplay: i.min_stock / f,
    active: i.active,
  };
}

function stockStatus(i: IngredientRow) {
  if (i.stock <= 0) return { tone: "red" as const, label: "Sin stock" };
  if (i.min_stock > 0 && i.stock < i.min_stock) return { tone: "amber" as const, label: "Bajo" };
  return { tone: "green" as const, label: "OK" };
}

export function IngredientsManager({
  ingredients,
  usage,
  categories,
}: {
  ingredients: IngredientRow[];
  usage: Record<string, number>;
  categories: IngredientCategory[];
}) {
  const [form, setForm] = useState<IngredientInput | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [pending, start] = useTransition();

  const list = useMemo(
    () =>
      ingredients.filter(
        (i) => (!cat || i.category === cat) && (!q || i.name.toLowerCase().includes(q.toLowerCase()))
      ),
    [ingredients, q, cat]
  );

  const v = useFormValidation(
    () => {
      const f = form ?? EMPTY;
      const duplicate = ingredients.some(
        (i) => i.id !== f.id && i.name.trim().toLowerCase() === f.name.trim().toLowerCase()
      );
      return {
        name: first(
          rules.required(f.name, "Escribe el nombre del ingrediente."),
          rules.minLength(f.name, 2, "Usa al menos 2 caracteres."),
          duplicate ? "Ya existe un ingrediente con ese nombre." : null
        ),
        categoryId: rules.required(f.categoryId, "Elige la categoría."),
        cost: f.costPerDisplayUnit > 0 ? null : `Escribe el costo por ${displayUnit(f.unit)}.`,
        minStock: f.minStockDisplay >= 0 ? null : "No puede ser negativo.",
      };
    },
    () => form ?? EMPTY,
    "ingredient"
  );

  const openForm = (input: IngredientInput) => {
    v.reset();
    setForm(input);
  };

  const submit = () => {
    if (!form) return;
    start(async () => {
      const result = await saveIngredient(form);
      notify(result);
      if (result.ok) setForm(null);
    });
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Panel
        bodyClassName="p-0"
        title={`${list.length} ingredientes`}
        description="Costo por kilo, litro o unidad. Las recetas usan gramos, mililitros o unidades."
        actions={
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1B1B1B]/35" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar"
                className="h-9 w-40 rounded-full border border-[#1F4D36]/12 bg-[#F8F7F2] pl-9 pr-3 text-sm outline-none focus:border-[#8BC34A] focus:bg-white"
              />
            </div>
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 rounded-full border border-[#1F4D36]/12 bg-[#F8F7F2] px-3 text-sm">
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        }
      >
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-y border-[#1F4D36]/[0.06] bg-[#F8F7F2]/60 text-[11px] font-bold uppercase tracking-wider text-[#1B1B1B]/40">
                <th className="px-6 py-3">Ingrediente</th>
                <th className="px-3 py-3 text-right">Costo</th>
                <th className="px-3 py-3 text-right">Stock</th>
                <th className="px-3 py-3 text-right">Mínimo</th>
                <th className="px-3 py-3 text-center">Recetas</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {list.map((i) => {
                const status = stockStatus(i);
                return (
                  <tr
                    key={i.id}
                    className={cn(
                      "border-b border-[#1F4D36]/[0.05] last:border-0 hover:bg-[#F8F7F2]/60",
                      !i.active && "opacity-50",
                      form?.id === i.id && "bg-[#F4F8F2]"
                    )}
                  >
                    <td className="px-6 py-3">
                      <p className="font-semibold text-[#1F4D36]">{i.name}</p>
                      <p className="text-xs text-[#1B1B1B]/45">{i.categoryName}</p>
                    </td>
                    <td className="px-3 py-3 text-right text-[#1B1B1B]/70">
                      {formatPrice(Math.round(i.cost_per_unit * unitFactor(i.unit)))}
                      <span className="text-xs text-[#1B1B1B]/40"> /{displayUnit(i.unit)}</span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="mr-2 font-medium text-[#1B1B1B]/75">{formatQty(i.stock, i.unit)}</span>
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                    </td>
                    <td className="px-3 py-3 text-right text-[#1B1B1B]/50">{formatQty(i.min_stock, i.unit)}</td>
                    <td className="px-3 py-3 text-center text-[#1B1B1B]/55">{usage[i.id] ?? 0}</td>
                    <td className="px-6 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openForm(toInput(i))}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#1F4D36]/70 hover:bg-[#F4F8F2] hover:text-[#1F4D36]"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="xl:sticky xl:top-24">
        {form ? (
          <Panel
            title={form.id ? "Editar ingrediente" : "Nuevo ingrediente"}
            actions={
              <button type="button" aria-label="Cerrar" onClick={() => setForm(null)} className="rounded-lg p-1 text-[#1B1B1B]/40 hover:bg-[#F4F8F2]">
                <X className="h-4 w-4" />
              </button>
            }
          >
            <form {...v.formProps(submit)} className="space-y-4">
              <Field label="Nombre" name={v.idFor("name")} error={v.error("name")}>
                <Input {...v.field("name")} className="h-11" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Categoría" name={v.idFor("categoryId")} error={v.error("categoryId")}>
                  <select {...v.field("categoryId")} className={selectClass} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                    {!form.categoryId && <option value="">Elige…</option>}
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} disabled={!c.active && c.id !== form.categoryId}>
                        {c.name}
                        {!c.active ? " (inactiva)" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Se mide en" name={v.idFor("unit")}>
                  <select {...v.field("unit")} className={selectClass} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value as Unit })}>
                    <option value="g">Gramos (g)</option>
                    <option value="ml">Mililitros (ml)</option>
                    <option value="un">Unidades</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label={`Costo por ${displayUnit(form.unit)}`} name={v.idFor("cost")} error={v.error("cost")}>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#1B1B1B]/40">$</span>
                    <Input
                      {...v.field("cost")}
                      inputMode="numeric"
                      className="h-11 pl-7"
                      value={form.costPerDisplayUnit || ""}
                      onChange={(e) => setForm({ ...form, costPerDisplayUnit: Number(e.target.value.replace(/\D/g, "") || 0) })}
                    />
                  </div>
                </Field>
                <Field label={`Stock mínimo (${displayUnit(form.unit)})`} name={v.idFor("minStock")} error={v.error("minStock")}>
                  <Input
                    {...v.field("minStock")}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    className="h-11"
                    value={form.minStockDisplay || ""}
                    onChange={(e) => setForm({ ...form, minStockDisplay: Number(e.target.value) })}
                  />
                </Field>
              </div>
              <p className="text-xs text-[#1B1B1B]/45">
                Cuando el stock baje del mínimo, el equipo de inventario recibe una alerta. El stock se mueve desde{" "}
                <strong>Inventario</strong>.
              </p>
              <label className="flex items-center gap-2.5 text-sm font-medium text-[#1B1B1B]/70">
                <Switch size="sm" label="Activo" checked={form.active} onChange={(v) => setForm({ ...form, active: v })} />
                Activo (disponible en recetas)
              </label>
              <Button className="w-full" type="submit" disabled={pending}>
                {pending ? "Guardando…" : "Guardar"}
              </Button>
            </form>
          </Panel>
        ) : (
          <Panel title="Ingredientes" description="Define cada insumo una vez y úsalo en las recetas y el armador.">
            <Button
              className="w-full"
              type="button"
              onClick={() => openForm({ ...EMPTY, categoryId: categories.find((c) => c.active)?.id ?? "" })}
            >
              <Plus className="h-4 w-4" /> Nuevo ingrediente
            </Button>
          </Panel>
        )}
      </div>
    </div>
  );
}
