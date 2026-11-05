"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Boxes, Leaf } from "lucide-react";
import {
  saveIngredient,
  type IngredientInput,
} from "@/app/admin/catalogo/actions";
import { Panel, StatusBadge, fieldLabelClass } from "@/components/dashboard/ui";
import { MacroRing } from "@/components/menu/NutritionFacts";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useFormValidation } from "@/hooks/use-form-validation";
import { ALLERGENS } from "@/lib/nutrition";
import { notify, toast } from "@/lib/notify";
import {
  displayUnit,
  formatQty,
  type IngredientCategory,
  type Unit,
} from "@/lib/pricing";
import { STOCK_INGREDIENT_IMAGES } from "@/lib/product-image";
import { uploadCatalogImage } from "@/lib/upload-image";
import { first, rules } from "@/lib/validation";
import { cn } from "@/lib/utils";
import { ProductImagePicker } from "./ProductImagePicker";

const selectClass =
  "h-11 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-3 text-sm text-[#1B1B1B]";

const NUTRIENTS = [
  { key: "kcal", label: "Calorías", unit: "kcal" },
  { key: "protein", label: "Proteína", unit: "g" },
  { key: "carbs", label: "Carbohidratos", unit: "g" },
  { key: "fat", label: "Grasas", unit: "g" },
  { key: "fiber", label: "Fibra", unit: "g" },
] as const;

const per = (unit: Unit) =>
  unit === "un"
    ? "por unidad"
    : unit === "ml"
      ? "por cada 100 ml"
      : "por cada 100 g";

export type IngredientStock = { stock: number; minStock: number; unit: Unit };

export function IngredientEditor({
  initial,
  categories,
  names,
  stock,
  usage,
}: {
  initial: IngredientInput;
  categories: IngredientCategory[];
  /** Otros ingredientes, para validar nombres repetidos. */
  names: { id: string; name: string }[];
  /** Stock actual (solo al editar). */
  stock: IngredientStock | null;
  /** Recetas y opciones del armador que lo usan. */
  usage: number;
}) {
  const [form, setForm] = useState<IngredientInput>(initial);
  const [pending, start] = useTransition();
  const [uploading, startUpload] = useTransition();
  const router = useRouter();
  const update = (patch: Partial<IngredientInput>) =>
    setForm((f) => ({ ...f, ...patch }));
  const n = form.nutrition;

  const v = useFormValidation(
    () => {
      const duplicate = names.some(
        (i) =>
          i.id !== form.id &&
          i.name.trim().toLowerCase() === form.name.trim().toLowerCase(),
      );
      return {
        name: first(
          rules.required(form.name, "Escribe el nombre del ingrediente."),
          rules.minLength(form.name, 2, "Usa al menos 2 caracteres."),
          duplicate ? "Ya existe un ingrediente con ese nombre." : null,
        ),
        categoryId: rules.required(form.categoryId, "Elige la categoría."),
        cost:
          form.costPerDisplayUnit > 0
            ? null
            : `Escribe el costo por ${displayUnit(form.unit)}.`,
        minStock: form.minStockDisplay >= 0 ? null : "No puede ser negativo.",
        nutrition:
          form.unit !== "un" && n.protein + n.carbs + n.fat > 100
            ? "Proteína, carbohidratos y grasas no pueden sumar más de 100 g."
            : null,
      };
    },
    () => form,
    "ingredient",
  );

  const submit = () =>
    start(async () => {
      if (notify(await saveIngredient(form)))
        router.push("/admin/catalogo/ingredientes");
    });

  const upload = (file?: File) => {
    if (!file) return;
    startUpload(async () => {
      const r = await uploadCatalogImage(file, "ingredientes", 700);
      if (r.url) {
        update({ imageUrl: r.url });
        toast.success("Foto cargada. Guarda el ingrediente para aplicarla.");
      } else toast.error(r.error ?? "No se pudo subir la foto.");
    });
  };

  const status = stock
    ? stock.stock <= 0
      ? { tone: "red" as const, label: "Sin stock" }
      : stock.minStock > 0 && stock.stock < stock.minStock
        ? { tone: "amber" as const, label: "Bajo" }
        : { tone: "green" as const, label: "OK" }
    : null;

  return (
    <form
      {...v.formProps(submit)}
      className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"
    >
      <div className="space-y-6">
        <Panel
          title="Información"
          description="Cómo se llama, cómo se mide y cómo se ve en el armador."
        >
          <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
            <div className="mx-auto w-full max-w-[200px] md:max-w-none">
              <ProductImagePicker
                value={form.imageUrl}
                uploading={uploading}
                onUpload={upload}
                onChange={(imageUrl) => update({ imageUrl })}
                gallery={STOCK_INGREDIENT_IMAGES}
                fallback={null}
                emptyLabel="Sin foto"
              />
            </div>
            <div className="space-y-4">
              <Field
                label="Nombre"
                name={v.idFor("name")}
                error={v.error("name")}
              >
                <Input
                  {...v.field("name")}
                  className="h-11"
                  value={form.name}
                  onChange={(e) => update({ name: e.target.value })}
                  placeholder="Pechuga de pollo"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Categoría"
                  name={v.idFor("categoryId")}
                  error={v.error("categoryId")}
                >
                  <select
                    {...v.field("categoryId")}
                    className={selectClass}
                    value={form.categoryId}
                    onChange={(e) => update({ categoryId: e.target.value })}
                  >
                    {!form.categoryId && <option value="">Elige…</option>}
                    {categories.map((c) => (
                      <option
                        key={c.id}
                        value={c.id}
                        disabled={!c.active && c.id !== form.categoryId}
                      >
                        {c.name}
                        {!c.active ? " (inactiva)" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <label className={fieldLabelClass}>
                  Se mide en
                  <select
                    className={cn(selectClass, "mt-1.5")}
                    value={form.unit}
                    onChange={(e) => update({ unit: e.target.value as Unit })}
                  >
                    <option value="g">Gramos (g)</option>
                    <option value="ml">Mililitros (ml)</option>
                    <option value="un">Unidades</option>
                  </select>
                </label>
              </div>
              {stock && stock.unit !== form.unit && (
                <p className="rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  La unidad solo se puede cambiar si el ingrediente no tiene
                  movimientos de inventario. Revisa las cantidades de las
                  recetas que lo usan.
                </p>
              )}
              <label className="flex items-center gap-2.5 text-sm font-medium text-[#1B1B1B]/70">
                <Switch
                  size="sm"
                  label="Activo"
                  checked={form.active}
                  onChange={(value) => update({ active: value })}
                />
                Activo (disponible en recetas y en el armador)
              </label>
            </div>
          </div>
        </Panel>

        <Panel
          title="Nutrición y alérgenos"
          description={`Valores ${per(form.unit)}. Con ellos se calcula la tabla nutricional de cada producto y del armador.`}
        >
          <div className="grid items-center gap-6 md:grid-cols-[auto_minmax(0,1fr)]">
            <div className="flex justify-center">
              {n.kcal > 0 || n.protein + n.carbs + n.fat > 0 ? (
                <MacroRing nutrition={{ ...n, weight: 0 }} size={120} />
              ) : (
                <div className="flex h-[120px] w-[120px] items-center justify-center rounded-full border-[13px] border-[#EEF3EA] text-center text-[11px] text-[#1B1B1B]/40">
                  Sin datos
                </div>
              )}
            </div>
            <div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {NUTRIENTS.map((item) => (
                  <label
                    key={item.key}
                    className="text-xs font-semibold text-[#1B1B1B]/55"
                  >
                    {item.label}
                    <span className="relative mt-1 block">
                      <Input
                        name={
                          item.key === "protein"
                            ? v.idFor("nutrition")
                            : undefined
                        }
                        aria-invalid={
                          v.error("nutrition") &&
                          item.key !== "kcal" &&
                          item.key !== "fiber"
                            ? true
                            : undefined
                        }
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="any"
                        className="h-10 pr-11"
                        value={n[item.key] || ""}
                        onChange={(e) =>
                          update({
                            nutrition: {
                              ...n,
                              [item.key]: Math.max(
                                0,
                                Number(e.target.value) || 0,
                              ),
                            },
                          })
                        }
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#1B1B1B]/40">
                        {item.unit}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <FieldError
                name={v.idFor("nutrition")}
                error={v.error("nutrition")}
                className="mt-2"
              />
            </div>
          </div>

          <p className="mt-6 text-xs font-semibold text-[#1B1B1B]/55">
            Alérgenos que contiene
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ALLERGENS.map((a) => {
              const on = form.allergens.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    update({
                      allergens: on
                        ? form.allergens.filter((x) => x !== a.id)
                        : [...form.allergens, a.id],
                    })
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    on
                      ? "border-amber-300 bg-amber-50 text-amber-800"
                      : "border-[#1F4D36]/15 bg-white text-[#1B1B1B]/55 hover:border-amber-300",
                  )}
                >
                  <span aria-hidden>{a.emoji}</span>
                  {a.label}
                </button>
              );
            })}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[#1B1B1B]/40">
            <Leaf className="h-3 w-3" /> Los productos heredan los alérgenos de
            sus ingredientes.
          </p>
        </Panel>
      </div>

      <div className="space-y-4 xl:sticky xl:top-24">
        <Panel title="Costo e inventario" icon={Boxes}>
          <div className="space-y-4">
            <Field
              label={`Costo por ${displayUnit(form.unit)}`}
              name={v.idFor("cost")}
              error={v.error("cost")}
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#1B1B1B]/40">
                  $
                </span>
                <Input
                  {...v.field("cost")}
                  inputMode="numeric"
                  className="h-12 pl-8 font-display text-lg font-bold text-[#1F4D36]"
                  value={form.costPerDisplayUnit || ""}
                  onChange={(e) =>
                    update({
                      costPerDisplayUnit: Number(
                        e.target.value.replace(/\D/g, "") || 0,
                      ),
                    })
                  }
                />
              </div>
            </Field>
            <Field
              label={`Stock mínimo (${displayUnit(form.unit)})`}
              name={v.idFor("minStock")}
              error={v.error("minStock")}
              hint="Por debajo de este valor, el equipo recibe una alerta."
            >
              <Input
                {...v.field("minStock")}
                type="number"
                inputMode="decimal"
                step="any"
                className="h-11"
                value={form.minStockDisplay || ""}
                onChange={(e) =>
                  update({ minStockDisplay: Number(e.target.value) })
                }
              />
            </Field>
            {stock && status && (
              <div className="flex items-center justify-between rounded-2xl bg-[#F8F7F2] px-3 py-2.5">
                <div>
                  <p className="text-xs text-[#1B1B1B]/50">Stock actual</p>
                  <p className="font-display text-lg font-bold text-[#1F4D36]">
                    {formatQty(stock.stock, stock.unit)}
                  </p>
                </div>
                <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              </div>
            )}
            <Link
              href="/admin/inventario"
              className="flex items-center justify-between rounded-2xl border border-[#1F4D36]/10 px-3 py-2.5 text-xs font-semibold text-[#1F4D36] hover:bg-[#F4F8F2]"
            >
              Registrar compras o pérdidas en Inventario
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Panel>

        {form.id && (
          <Panel title="Dónde se usa">
            <p className="text-sm text-[#1B1B1B]/60">
              {usage === 0
                ? "Todavía no está en ninguna receta ni en el armador."
                : `En ${usage} ${usage === 1 ? "receta u opción del armador" : "recetas u opciones del armador"}. Los cambios de costo, foto y nutrición se reflejan ahí.`}
            </p>
          </Panel>
        )}

        <Button
          className="w-full"
          size="lg"
          type="submit"
          disabled={pending || uploading}
        >
          {pending
            ? "Guardando…"
            : form.id
              ? "Guardar ingrediente"
              : "Crear ingrediente"}
        </Button>
      </div>
    </form>
  );
}
