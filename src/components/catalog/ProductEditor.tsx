"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { notify, toast } from "@/lib/notify";
import { Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { saveProduct, type ProductInput } from "@/app/admin/catalogo/actions";
import { Panel, StatusBadge, fieldLabelClass } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFormValidation } from "@/hooks/use-form-validation";
import { first, rules } from "@/lib/validation";
import { Switch } from "@/components/ui/switch";
import {
  formatPercent,
  planDishValue,
  realMargin,
  suggestedPrice,
  type CategoryPricing,
  type IngredientCategory,
  type PricingSettings,
  type Unit,
} from "@/lib/pricing";
import type { IngredientNutrition, PlanRow } from "@/lib/catalog-admin";
import { ALLERGENS, EMPTY_NUTRITION, type Nutrition } from "@/lib/nutrition";
import { ProductNutritionPanel } from "./ProductNutritionPanel";
import { ProductImagePicker } from "./ProductImagePicker";
import { uploadCatalogImage } from "@/lib/upload-image";
import { cn, formatPrice } from "@/lib/utils";

export type EditorIngredient = {
  id: string;
  name: string;
  category: string;
  unit: Unit;
  cost_per_unit: number;
  active: boolean;
  nutrition: IngredientNutrition;
  allergens: string[];
};

/** Suma la nutrición de la receta (misma regla que la base de datos). */
function recipeNutrition(lines: { quantity: number; ing?: EditorIngredient }[]) {
  const total: Nutrition = { ...EMPTY_NUTRITION };
  const allergens = new Set<string>();
  for (const { quantity, ing } of lines) {
    if (!ing || !(quantity > 0)) continue;
    const factor = ing.unit === "un" ? quantity : quantity / 100;
    total.kcal += ing.nutrition.kcal * factor;
    total.protein += ing.nutrition.protein * factor;
    total.carbs += ing.nutrition.carbs * factor;
    total.fat += ing.nutrition.fat * factor;
    total.fiber += ing.nutrition.fiber * factor;
    if (ing.unit !== "un") total.weight += quantity;
    ing.allergens.forEach((a) => allergens.add(a));
  }
  const r1 = (x: number) => Math.round(x * 10) / 10;
  return {
    nutrition: { kcal: Math.round(total.kcal), protein: r1(total.protein), carbs: r1(total.carbs), fat: r1(total.fat), fiber: r1(total.fiber), weight: Math.round(total.weight) },
    allergens: ALLERGENS.map((a) => a.id as string).filter((id) => allergens.has(id)),
  };
}

const selectClass = "h-11 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-3 text-sm text-[#1B1B1B]";


export function ProductEditor({
  initial,
  ingredients,
  settings,
  categories,
  ingredientCategories,
  plans,
}: {
  initial: ProductInput;
  ingredients: EditorIngredient[];
  settings: PricingSettings;
  categories: CategoryPricing[];
  ingredientCategories: IngredientCategory[];
  plans: PlanRow[];
}) {
  const [p, setP] = useState<ProductInput>(initial);
  const [priceText, setPriceText] = useState(initial.price ? String(initial.price) : "");
  const [saving, startSave] = useTransition();
  const router = useRouter();
  const [uploading, startUpload] = useTransition();

  const update = (patch: Partial<ProductInput>) => setP((prev) => ({ ...prev, ...patch }));
  const byId = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);
  const isBuilder = p.kind === "builder";

  const lines = p.recipe.map((r) => {
    const ing = byId.get(r.ingredientId);
    return { ...r, ing, cost: ing ? r.quantity * ing.cost_per_unit : 0 };
  });
  const cost = Math.round(lines.reduce((s, l) => s + l.cost, 0));
  const computed = recipeNutrition(lines);
  const target = p.targetMargin ?? settings.targetMargin;
  const suggested = suggestedPrice(cost, target, settings.rounding);
  const price = p.price;
  const margin = realMargin(price, cost);
  const profit = price - cost;
  const marginTone = margin >= target - 0.005 ? "green" : margin >= target - 0.1 ? "amber" : "red";
  const base = settings.planBaseValue;
  const countsAs = planDishValue(price, base);

  const setPrice = (value: number) => {
    update({ price: value });
    setPriceText(value ? String(value) : "");
  };

  const upload = (file?: File) => {
    if (!file) return;
    startUpload(async () => {
      const r = await uploadCatalogImage(file);
      if (r.url) {
        update({ imageUrl: r.url });
        toast.success("Foto cargada. Guarda el producto para aplicarla.");
      } else toast.error(r.error ?? "No se pudo subir la foto.");
    });
  };

  const v = useFormValidation(
    () => {
      const errors: Record<string, string | null> = {
        name: first(rules.required(p.name, "Escribe el nombre del producto."), rules.minLength(p.name, 3, "Usa al menos 3 caracteres.")),
        categoryId: rules.required(p.categoryId, "Elige la categoría."),
        price: p.price > 0 ? null : isBuilder ? "Escribe el precio base." : "Escribe el precio de venta.",
        targetMargin:
          p.targetMargin !== null && (p.targetMargin < 0 || p.targetMargin >= 0.95) ? "El margen debe estar entre 0% y 94%." : null,
        recipe: !isBuilder && p.recipe.length === 0 ? "Agrega al menos un ingrediente a la receta." : null,
      };
      if (!isBuilder) {
        p.recipe.forEach((r, i) => {
          errors[`recipe-${i}`] = !r.ingredientId
            ? "Elige el ingrediente o quita la fila."
            : !(r.quantity > 0)
              ? "Escribe una cantidad mayor a 0."
              : null;
        });
      }
      return errors;
    },
    () => p,
    "product"
  );

  const submit = () => {
    startSave(async () => {
      if (notify(await saveProduct(p))) router.push("/admin/catalogo");
    });
  };

  const usedIds = new Set(p.recipe.map((r) => r.ingredientId));

  return (
    <form {...v.formProps(submit)} className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <Panel title="Información" description="Lo que ve el cliente en el menú.">
          <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
            <div>
              <ProductImagePicker
                value={p.imageUrl}
                uploading={uploading}
                onUpload={upload}
                onChange={(imageUrl) => update({ imageUrl })}
              />
            </div>

            <div className="space-y-4">
              <Field label="Nombre" name={v.idFor("name")} error={v.error("name")}>
                <Input {...v.field("name")} className="h-11" value={p.name} onChange={(e) => update({ name: e.target.value })} placeholder="FRESKO Pollo" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Categoría" name={v.idFor("categoryId")} error={v.error("categoryId")}>
                  <select {...v.field("categoryId")} className={selectClass} value={p.categoryId} onChange={(e) => update({ categoryId: e.target.value })}>
                    {!p.categoryId && <option value="">Elige…</option>}
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} disabled={!c.active && c.id !== p.categoryId}>
                        {c.name}
                        {!c.active ? " (inactiva)" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                <label className={fieldLabelClass}>
                  Tipo
                  <select className={cn(selectClass, "mt-1.5")} value={p.kind} onChange={(e) => update({ kind: e.target.value as ProductInput["kind"] })}>
                    <option value="fixed">Receta fija</option>
                    <option value="builder">Armador (Arma tu…)</option>
                  </select>
                </label>
                <label className={fieldLabelClass}>
                  Etiqueta
                  <Input className="mt-1.5 h-11" value={p.tag} onChange={(e) => update({ tag: e.target.value })} placeholder="Nuevo, Premium…" />
                </label>
              </div>
              <label className={fieldLabelClass}>
                Descripción
                <textarea
                  className="mt-1.5 min-h-20 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-4 py-3 text-sm text-[#1B1B1B] outline-none focus:ring-2 focus:ring-[#8BC34A]/50"
                  value={p.description}
                  onChange={(e) => update({ description: e.target.value })}
                  placeholder="Lechuga, pollo grillado, maíz, queso, ranch"
                />
              </label>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2.5 text-sm font-medium text-[#1B1B1B]/70">
                  <Switch size="sm" label="Visible" checked={p.active} onChange={(v) => update({ active: v })} />
                  Visible en el menú
                </label>
                <label className="flex items-center gap-2.5 text-sm font-medium text-[#1B1B1B]/70">
                  <Switch size="sm" label="Destacado" checked={p.featured} onChange={(v) => update({ featured: v })} />
                  En “Más pedidos”
                </label>
              </div>
            </div>
          </div>
        </Panel>

        {isBuilder ? (
          <Panel title="Receta" description="Los productos de tipo armador no tienen receta fija.">
            <p className="rounded-2xl bg-[#F8F7F2] p-4 text-sm text-[#1B1B1B]/60">
              El cliente elige los ingredientes en el armador. El costo y el inventario se calculan con las opciones que escoja
              (Configuración → <strong>Ajustes de venta</strong> → Armador).
              {p.recipe.length > 0 && " La receta que tenía se conserva por si lo vuelves a “Receta fija”."}
            </p>
          </Panel>
        ) : (
          <Panel
            title="Receta"
            description="Cantidad de cada ingrediente para una porción. El costo se calcula solo."
            actions={
              <Button
                size="sm"
                variant="secondary"
                type="button"
                onClick={() => update({ recipe: [...p.recipe, { ingredientId: "", quantity: 0 }] })}
              >
                <Plus className="h-4 w-4" /> Ingrediente
              </Button>
            }
          >
            {lines.length === 0 ? (
              <div
                tabIndex={-1}
                aria-invalid={v.error("recipe") ? true : undefined}
                className={cn(
                  "rounded-2xl border border-dashed p-6 text-center text-sm outline-none",
                  v.error("recipe") ? "border-red-300 bg-red-50/50 text-red-700" : "border-[#1F4D36]/15 text-[#1B1B1B]/45"
                )}
              >
                {v.error("recipe") ?? "Agrega los ingredientes para calcular el costo."}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="hidden grid-cols-[minmax(0,1fr)_130px_110px_36px] gap-3 px-1 text-[11px] font-bold uppercase tracking-wider text-[#1B1B1B]/40 sm:grid">
                  <span>Ingrediente</span>
                  <span>Cantidad</span>
                  <span className="text-right">Costo</span>
                  <span />
                </div>
                {lines.map((line, index) => (
                  <div key={index}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-[#F8F7F2] p-2 sm:grid-cols-[minmax(0,1fr)_130px_110px_36px] sm:bg-transparent sm:p-0">
                    <select
                      {...v.field(`recipe-${index}`)}
                      aria-label={`Ingrediente ${index + 1}`}
                      aria-invalid={v.error(`recipe-${index}`) && !line.ingredientId ? true : undefined}
                      className={selectClass}
                      value={line.ingredientId}
                      onChange={(e) =>
                        update({ recipe: p.recipe.map((r, i) => (i === index ? { ...r, ingredientId: e.target.value } : r)) })
                      }
                    >
                      <option value="">Elige un ingrediente…</option>
                      {ingredientCategories.map((cat) => {
                        const group = ingredients.filter((i) => i.category === cat.id && (i.active || i.id === line.ingredientId));
                        if (!group.length) return null;
                        return (
                          <optgroup key={cat.id} label={cat.name}>
                            {group.map((i) => (
                              <option key={i.id} value={i.id} disabled={usedIds.has(i.id) && i.id !== line.ingredientId}>
                                {i.name}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </select>
                    <div className="relative">
                      <Input
                        name={`recipe-${index}`}
                        aria-label={`Cantidad ${index + 1}`}
                        aria-invalid={v.error(`recipe-${index}`) && line.ingredientId ? true : undefined}
                        type="number"
                        inputMode="decimal"
                        step="any"
                        className="h-11 pr-10"
                        value={line.quantity || ""}
                        onChange={(e) =>
                          update({ recipe: p.recipe.map((r, i) => (i === index ? { ...r, quantity: Number(e.target.value) } : r)) })
                        }
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#1B1B1B]/40">
                        {line.ing?.unit ?? ""}
                      </span>
                    </div>
                    <span className="text-right text-sm font-medium text-[#1B1B1B]/65">{formatPrice(Math.round(line.cost))}</span>
                    <button
                      type="button"
                      aria-label="Quitar ingrediente"
                      onClick={() => update({ recipe: p.recipe.filter((_, i) => i !== index) })}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-[#1F4D36]/40 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <FieldError name={v.idFor(`recipe-${index}`)} error={v.error(`recipe-${index}`)} className="px-1" />
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-[#1F4D36]/[0.06] px-1 pt-3 text-sm">
                  <span className="font-semibold text-[#1F4D36]">Costo por porción</span>
                  <span className="font-display text-lg font-bold text-[#1F4D36]">{formatPrice(cost)}</span>
                </div>
              </div>
            )}
          </Panel>
        )}

        <ProductNutritionPanel
          mode={p.nutritionMode}
          auto={computed.nutrition}
          manual={p.nutritionManual}
          allergens={computed.allergens}
          tags={p.dietaryTags}
          isBuilder={isBuilder}
          onChange={update}
        />
      </div>

      {/* Precio */}
      <div className="space-y-4 xl:sticky xl:top-24">
        <Panel title="Precio" icon={Sparkles}>
          <div className="space-y-4">
            {!isBuilder && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#F8F7F2] p-3">
                    <p className="text-xs text-[#1B1B1B]/50">Costo receta</p>
                    <p className="font-display text-lg font-bold text-[#1F4D36]">{formatPrice(cost)}</p>
                  </div>
                  <label className="rounded-2xl bg-[#F8F7F2] p-3 text-xs text-[#1B1B1B]/50">
                    Margen objetivo
                    <span className="mt-0.5 flex items-center gap-1">
                      <input
                        {...v.field("targetMargin")}
                        aria-label="Margen objetivo"
                        type="number"
                        inputMode="numeric"
                        className="w-14 rounded-lg border border-[#1F4D36]/15 bg-white px-2 py-1 font-display text-base font-bold text-[#1F4D36]"
                        value={Math.round(target * 100)}
                        onChange={(e) => {
                          const v = Number(e.target.value) / 100;
                          update({ targetMargin: Math.abs(v - settings.targetMargin) < 0.0001 ? null : v });
                        }}
                      />
                      <span className="font-display text-base font-bold text-[#1F4D36]">%</span>
                    </span>
                    <FieldError name={v.idFor("targetMargin")} error={v.error("targetMargin")} />
                  </label>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-dashed border-[#8BC34A] bg-[#F4F8F2] p-3">
                  <div>
                    <p className="text-xs text-[#1B1B1B]/50">Precio sugerido</p>
                    <p className="font-display text-xl font-bold text-[#1F4D36]">{cost ? formatPrice(suggested) : "—"}</p>
                  </div>
                  <Button type="button" size="sm" variant="fresh" disabled={!cost || suggested === price} onClick={() => setPrice(suggested)}>
                    <Wand2 className="h-4 w-4" /> Usar
                  </Button>
                </div>
              </>
            )}

            <Field label={isBuilder ? "Precio base" : "Precio de venta"} name={v.idFor("price")} error={v.error("price")}>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#1B1B1B]/40">$</span>
                <Input
                  {...v.field("price")}
                  inputMode="numeric"
                  className="h-12 pl-8 font-display text-lg font-bold text-[#1F4D36]"
                  value={priceText}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setPriceText(digits);
                    update({ price: Number(digits || 0) });
                  }}
                />
              </div>
            </Field>

            {!isBuilder && price > 0 && (
              cost > 0 ? (
                <div
                  className={cn(
                    "rounded-2xl border p-3",
                    marginTone === "green" && "border-[#8BC34A]/40 bg-[#F4F8F2]",
                    marginTone === "amber" && "border-amber-200 bg-amber-50/60",
                    marginTone === "red" && "border-red-200 bg-red-50/60"
                  )}
                >
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs text-[#1B1B1B]/50">Utilidad por plato</p>
                      <p
                        className={cn(
                          "font-display text-2xl font-bold",
                          profit < 0 ? "text-red-700" : marginTone === "amber" ? "text-amber-700" : "text-[#1F4D36]"
                        )}
                      >
                        {formatPrice(profit)}
                      </p>
                    </div>
                    <StatusBadge tone={marginTone}>Margen {formatPercent(margin)}</StatusBadge>
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#1B1B1B]/50">
                    {formatPrice(price)} de venta − {formatPrice(cost)} de costo ({formatPercent(cost / price)} del precio)
                  </p>
                  {cost / price < 0.1 && (
                    <p className="mt-2 rounded-xl bg-amber-100/70 px-2.5 py-1.5 text-[11px] font-medium text-amber-800">
                      El costo es menos del 10 % del precio. Revisa que la receta tenga todos los ingredientes.
                    </p>
                  )}
                </div>
              ) : (
                <p className="rounded-2xl bg-[#F8F7F2] p-3 text-xs text-[#1B1B1B]/50">Agrega la receta para calcular la utilidad.</p>
              )
            )}
          </div>
        </Panel>

        <Panel title="Precio en los planes" description="Lo que paga el cliente por este plato en cada plan, con el descuento.">
          {plans.length > 0 ? (
            <dl className="space-y-2.5 text-sm">
              {plans.map((plan) => (
                <div key={plan.id} className="flex items-center justify-between px-1">
                  <dt className="text-[#1B1B1B]/60">
                    {plan.name}
                    <span className="ml-1 text-xs text-[#1B1B1B]/40">−{formatPercent(plan.discount)}</span>
                  </dt>
                  <dd className="text-right">
                    <span className="font-semibold text-[#1F4D36]">{formatPrice(Math.round(countsAs * (1 - plan.discount)))}</span>
                    {!isBuilder && cost > 0 && (
                      <span className={cn("block text-[11px]", Math.round(countsAs * (1 - plan.discount)) - cost < 0 ? "text-red-700" : "text-[#1B1B1B]/45")}>
                        utilidad {formatPrice(Math.round(countsAs * (1 - plan.discount)) - cost)}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-xs text-[#1B1B1B]/45">No hay planes activos.</p>
          )}
        </Panel>

        <Button className="w-full" size="lg" type="submit" disabled={saving || uploading}>
          {saving ? "Guardando…" : "Guardar producto"}
        </Button>
      </div>
    </form>
  );
}
