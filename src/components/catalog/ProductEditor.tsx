"use client";

import Image from "next/image";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { notify, toast } from "@/lib/notify";
import { ImagePlus, Loader2, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
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
  planExtra,
  realMargin,
  suggestedPrice,
  type CategoryPricing,
  type IngredientCategory,
  type PricingSettings,
  type Unit,
} from "@/lib/pricing";
import type { PlanRow } from "@/lib/catalog-admin";
import { createClient } from "@/lib/supabase/client";
import { cn, formatPrice } from "@/lib/utils";

export type EditorIngredient = { id: string; name: string; category: string; unit: Unit; cost_per_unit: number; active: boolean };

const selectClass = "h-11 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-3 text-sm text-[#1B1B1B]";

/** Ajusta a máx. 900 px (sin recortar) y convierte a WebP conservando transparencia. */
async function toWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("imagen"))), "image/webp", 0.88)
  );
}

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
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<ProductInput>) => setP((prev) => ({ ...prev, ...patch }));
  const byId = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);
  const isBuilder = p.kind === "builder";

  const lines = p.recipe.map((r) => {
    const ing = byId.get(r.ingredientId);
    return { ...r, ing, cost: ing ? r.quantity * ing.cost_per_unit : 0 };
  });
  const cost = Math.round(lines.reduce((s, l) => s + l.cost, 0));
  const target = p.targetMargin ?? settings.targetMargin;
  const suggested = suggestedPrice(cost, target, settings.rounding);
  const price = p.price;
  const margin = realMargin(price, cost);
  const marginTone = margin >= target - 0.005 ? "green" : margin >= target - 0.1 ? "amber" : "red";
  const base = settings.planBaseValue;
  const extra = planExtra(price, base);
  const countsAs = planDishValue(price, base);

  const setPrice = (value: number) => {
    update({ price: value });
    setPriceText(value ? String(value) : "");
  };

  const upload = (file?: File) => {
    if (!file) return;
    startUpload(async () => {
      try {
        const blob = await toWebp(file);
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
        const supabase = createClient();
        const { error: upError } = await supabase.storage.from("products").upload(path, blob, { contentType: "image/webp" });
        if (upError) throw upError;
        update({ imageUrl: supabase.storage.from("products").getPublicUrl(path).data.publicUrl });
        toast.success("Foto cargada. Guarda el producto para aplicarla.");
      } catch {
        toast.error("No se pudo subir la foto. Intenta con otra imagen.");
      }
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
          <div className="grid gap-5 md:grid-cols-[180px_1fr]">
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#1F4D36]/15 bg-[#F8F7F2] transition-colors hover:border-[#8BC34A]"
              >
                {p.imageUrl ? (
                  <Image src={p.imageUrl} alt="" fill sizes="180px" className="object-contain p-3" />
                ) : (
                  <span className="flex flex-col items-center gap-1 text-xs text-[#1B1B1B]/45">
                    <ImagePlus className="h-6 w-6" /> Subir foto
                  </span>
                )}
                {uploading && (
                  <span className="absolute inset-0 flex items-center justify-center bg-white/70">
                    <Loader2 className="h-6 w-6 animate-spin text-[#1F4D36]" />
                  </span>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  upload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              {p.imageUrl && (
                <button type="button" onClick={() => update({ imageUrl: null })} className="mt-2 w-full text-xs text-[#1B1B1B]/45 hover:text-red-700">
                  Quitar foto
                </button>
              )}
              <p className="mt-2 text-[11px] leading-snug text-[#1B1B1B]/40">PNG con fondo transparente se ve mejor.</p>
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

            {!isBuilder && cost > 0 && price > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#1B1B1B]/55">Margen real</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-[#1B1B1B]/40">costo {formatPercent(cost / price)}</span>
                  <StatusBadge tone={marginTone}>{formatPercent(margin)}</StatusBadge>
                </span>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="En los planes" description={`Cada porción cuenta mínimo ${formatPrice(base)} (valor base).`}>
          <div className="mb-3 flex items-center justify-between rounded-2xl bg-[#F8F7F2] px-3 py-2.5 text-sm">
            <span className="text-[#1B1B1B]/60">Extra sobre la base</span>
            <span className={extra ? "font-display font-bold text-amber-700" : "font-semibold text-[#2E6B1F]"}>
              {extra ? `+${formatPrice(extra)}` : "Sin extra"}
            </span>
          </div>
          {plans.length > 0 ? (
            <dl className="space-y-1.5 text-sm">
              {plans.map((plan) => (
                <div key={plan.id} className="flex items-center justify-between px-1">
                  <dt className="text-[#1B1B1B]/60">
                    {plan.name}
                    <span className="ml-1 text-xs text-[#1B1B1B]/40">−{formatPercent(plan.discount)}</span>
                  </dt>
                  <dd className="font-semibold text-[#1F4D36]">{formatPrice(Math.round(countsAs * (1 - plan.discount)))}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-xs text-[#1B1B1B]/45">No hay planes activos.</p>
          )}
          <p className="mt-3 text-[11px] leading-snug text-[#1B1B1B]/40">
            Lo que paga el cliente por este plato dentro de cada plan, ya con el descuento.
          </p>
        </Panel>

        <Button className="w-full" size="lg" type="submit" disabled={saving || uploading}>
          {saving ? "Guardando…" : "Guardar producto"}
        </Button>
      </div>
    </form>
  );
}
