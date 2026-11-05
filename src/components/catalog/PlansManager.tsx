"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { deletePlan, savePlan, savePlanBaseValue, type PlanInput } from "@/app/admin/catalogo/actions";
import { Panel, StatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFormValidation } from "@/hooks/use-form-validation";
import { first, rules } from "@/lib/validation";
import { Switch } from "@/components/ui/switch";
import type { PlanRow } from "@/lib/catalog-admin";
import { formatPercent, planFromPrice, planTotal } from "@/lib/pricing";
import { notify } from "@/lib/notify";
import { cn, formatPrice } from "@/lib/utils";

const EMPTY: PlanInput = {
  name: "",
  description: "",
  portions: 12,
  discount: 0.05,
  validityDays: 60,
  benefits: ["Domicilio incluido"],
  featured: false,
  active: true,
  sort: 0,
};

function toInput(p: PlanRow): PlanInput {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    portions: p.portions,
    discount: p.discount,
    validityDays: p.validity_days,
    benefits: p.benefits,
    featured: p.featured,
    active: p.active,
    sort: p.sort,
  };
}

function PlanCard({ plan, base, onEdit, selected }: { plan: PlanInput; base: number; onEdit?: () => void; selected?: boolean }) {
  const from = planFromPrice(plan.portions, base, plan.discount);
  return (
    <article
      className={cn(
        "relative flex flex-col rounded-3xl border-2 bg-white p-5",
        plan.featured ? "border-[#8BC34A]" : "border-[#1F4D36]/[0.07]",
        !plan.active && "opacity-55",
        selected && "ring-4 ring-[#8BC34A]/25"
      )}
    >
      {plan.featured && (
        <span className="absolute -top-3 left-5 flex items-center gap-1 rounded-full bg-[#8BC34A] px-3 py-0.5 text-[11px] font-bold text-[#1F4D36]">
          <Sparkles className="h-3 w-3" /> Más popular
        </span>
      )}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-bold text-[#1F4D36]">{plan.name || "Nuevo plan"}</h3>
          <p className="text-xs text-[#1B1B1B]/50">
            {plan.portions} platos · {plan.validityDays} días para programarlos
          </p>
        </div>
        {!plan.active && <StatusBadge tone="gray" dot={false}>Inactivo</StatusBadge>}
      </div>
      <p className="mt-4 text-xs text-[#1B1B1B]/45">Desde</p>
      <p className="font-display text-3xl font-bold text-[#1F4D36]">{formatPrice(from)}</p>
      <p className="mt-1 text-xs font-semibold text-[#7CB342]">
        {formatPercent(plan.discount)} de descuento · {formatPrice(Math.round(from / plan.portions))} por plato
      </p>
      <ul className="mt-4 flex-1 space-y-1.5">
        {plan.benefits.filter(Boolean).map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-[#1B1B1B]/65">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8BC34A]" /> {b}
          </li>
        ))}
      </ul>
      {onEdit && (
        <Button size="sm" variant="secondary" className="mt-5" type="button" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" /> Editar
        </Button>
      )}
    </article>
  );
}

export function PlansManager({ plans, baseValue, recommended }: { plans: PlanRow[]; baseValue: number; recommended: number }) {
  const [base, setBase] = useState(baseValue);
  const [baseText, setBaseText] = useState(String(baseValue));
  const [form, setForm] = useState<PlanInput | null>(null);
  const [benefitsText, setBenefitsText] = useState("");
  const [pending, start] = useTransition();

  const baseV = useFormValidation(
    () => ({ base: base > 0 ? (base > 1_000_000 ? "El valor parece demasiado alto." : null) : "Escribe el valor base en pesos." }),
    () => ({ base }),
    "plan-base"
  );

  const v = useFormValidation(
    () => {
      const f = form ?? EMPTY;
      const duplicate = plans.some((p) => p.id !== f.id && p.name.trim().toLowerCase() === f.name.trim().toLowerCase());
      const benefits = benefitsText.split("\n").map((b) => b.trim()).filter(Boolean);
      return {
        name: first(rules.required(f.name, "Escribe el nombre del plan."), duplicate ? "Ya existe un plan con ese nombre." : null),
        portions: first(rules.integer(f.portions || "", 1, "Debe ser al menos 1 plato."), rules.range(f.portions, 1, 200, "Máximo 200 platos.")),
        discount: rules.range(Math.round(f.discount * 100), 0, 89, "El descuento debe estar entre 0% y 89%."),
        validityDays: first(rules.integer(f.validityDays || "", 1, "Debe ser al menos 1 día."), rules.range(f.validityDays, 1, 365, "Máximo 365 días.")),
        benefits: benefits.length > 10 ? "Usa máximo 10 beneficios." : benefits.some((b) => b.length > 80) ? "Cada beneficio debe tener máximo 80 caracteres." : null,
      };
    },
    () => form ?? EMPTY,
    "plan"
  );

  const open = (input: PlanInput) => {
    v.reset();
    setForm(input);
    setBenefitsText(input.benefits.join("\n"));
  };

  const savePlanForm = () =>
    start(async () => {
      if (!current) return;
      const r = await savePlan(current);
      notify(r);
      if (r.ok) setForm(null);
    });
  const update = (patch: Partial<PlanInput>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const current = form ? { ...form, benefits: benefitsText.split("\n") } : null;

  // Ejemplo: 70% platos al valor base y 30% de $19.900, para mostrar el efecto del descuento.
  const sample = current
    ? planTotal(
        Array.from({ length: current.portions }, (_, i) => (i < Math.round(current.portions * 0.3) ? 19900 : base)),
        base,
        current.discount
      )
    : null;

  return (
    <div className="space-y-6">
      <Panel
        title="Valor base por porción"
        description="Lo mínimo que cuenta cada plato dentro de un plan. Un plato más caro suma su precio; uno más barato cuenta este valor."
      >
        <form
          {...baseV.formProps(() => start(async () => void notify(await savePlanBaseValue(base))))}
          className="flex flex-col gap-4 lg:flex-row lg:items-start"
        >
          <Field label="Valor base" name={baseV.idFor("base")} error={baseV.error("base")} className="lg:w-56">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#1B1B1B]/40">$</span>
              <Input
                {...baseV.field("base")}
                inputMode="numeric"
                className="h-11 pl-7 font-display text-base font-bold text-[#1F4D36]"
                value={baseText}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  setBaseText(digits);
                  setBase(Number(digits || 0));
                }}
              />
            </div>
          </Field>
          <div className="flex flex-1 flex-wrap items-center gap-3 lg:pt-6">
            {recommended > 0 && (
              <span className="flex items-center gap-2 rounded-2xl border border-dashed border-[#8BC34A] bg-[#F4F8F2] py-1.5 pl-3 pr-1.5 text-sm text-[#1F4D36]">
                Recomendado: <strong>{formatPrice(recommended)}</strong>
                <span className="text-xs text-[#1B1B1B]/45">(plato más económico)</span>
                <Button
                  size="sm"
                  variant="fresh"
                  type="button"
                  disabled={base === recommended}
                  onClick={() => {
                    setBase(recommended);
                    setBaseText(String(recommended));
                  }}
                >
                  <Wand2 className="h-3.5 w-3.5" /> Usar
                </Button>
              </span>
            )}
            <Button type="submit" disabled={pending || base === baseValue}>
              Guardar valor base
            </Button>
          </div>
        </form>
        <p className="mt-4 rounded-2xl bg-[#F8F7F2] p-4 text-xs leading-relaxed text-[#1B1B1B]/55">
          <strong>Total del plan</strong> = suma de los platos elegidos (cada uno mínimo {formatPrice(base)}) − descuento del plan. El descuento
          aplica sobre todo, también sobre los platos más caros. <strong>“Desde”</strong> = porciones × valor base − descuento. Si el cliente cambia
          un plato después de pagar por uno más caro, paga la diferencia con su descuento; por uno más barato no hay devolución.
        </p>
      </Panel>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-[#1B1B1B]/55">
              {plans.length} planes · se muestran en la landing en este orden. El domicilio está incluido en todos.
            </p>
            <Button size="sm" type="button" onClick={() => open({ ...EMPTY, sort: (plans.at(-1)?.sort ?? 0) + 1 })}>
              <Plus className="h-4 w-4" /> Nuevo plan
            </Button>
          </div>
          <div className="grid gap-5 pt-3 md:grid-cols-2 2xl:grid-cols-3">
            {plans.map((p) => (
              <PlanCard
                key={p.id}
                plan={form?.id === p.id && current ? current : toInput(p)}
                base={base}
                selected={form?.id === p.id}
                onEdit={() => open(toInput(p))}
              />
            ))}
            {form && !form.id && current && <PlanCard plan={current} base={base} selected />}
          </div>
        </div>

        <div className="xl:sticky xl:top-24">
          {form && current ? (
            <Panel
              title={form.id ? "Editar plan" : "Nuevo plan"}
              actions={
                <button type="button" aria-label="Cerrar" onClick={() => setForm(null)} className="rounded-lg p-1 text-[#1B1B1B]/40 hover:bg-[#F4F8F2]">
                  <X className="h-4 w-4" />
                </button>
              }
            >
              <form {...v.formProps(savePlanForm)} className="space-y-4">
                <Field label="Nombre" name={v.idFor("name")} error={v.error("name")}>
                  <Input {...v.field("name")} className="h-11" value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="Plan Smart" />
                </Field>
                <Field label="Descripción corta" optional name={v.idFor("description")}>
                  <Input {...v.field("description")} maxLength={120} className="h-11" value={form.description} onChange={(e) => update({ description: e.target.value })} />
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Platos" name={v.idFor("portions")} error={v.error("portions")}>
                    <Input {...v.field("portions")} type="number" inputMode="numeric" className="h-11" value={form.portions || ""} onChange={(e) => update({ portions: Number(e.target.value) })} />
                  </Field>
                  <Field label="Descuento" name={v.idFor("discount")} error={v.error("discount")}>
                    <div className="relative">
                      <Input
                        {...v.field("discount")}
                        type="number"
                        inputMode="numeric"
                        className="h-11 pr-7"
                        value={Math.round(form.discount * 100)}
                        onChange={(e) => update({ discount: Number(e.target.value) / 100 })}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#1B1B1B]/40">%</span>
                    </div>
                  </Field>
                  <Field label="Vigencia" name={v.idFor("validityDays")} error={v.error("validityDays")}>
                    <div className="relative">
                      <Input {...v.field("validityDays")} type="number" inputMode="numeric" className="h-11 pr-10" value={form.validityDays || ""} onChange={(e) => update({ validityDays: Number(e.target.value) })} />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#1B1B1B]/40">días</span>
                    </div>
                  </Field>
                </div>
                <Field label="Beneficios" name={v.idFor("benefits")} error={v.error("benefits")} hint="Uno por línea, máximo 10.">
                  <textarea
                    {...v.field("benefits")}
                    className="min-h-28 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-4 py-3 text-sm text-[#1B1B1B] outline-none focus:ring-2 focus:ring-[#8BC34A]/50"
                    value={benefitsText}
                    onChange={(e) => setBenefitsText(e.target.value)}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2.5 text-sm font-medium text-[#1B1B1B]/70">
                    <Switch size="sm" label="Destacado" checked={form.featured} onChange={(v) => update({ featured: v })} />
                    Más popular
                  </label>
                  <label className="flex items-center gap-2.5 text-sm font-medium text-[#1B1B1B]/70">
                    <Switch size="sm" label="Activo" checked={form.active} onChange={(v) => update({ active: v })} />
                    Activo
                  </label>
                </div>
                <Field label="Orden en la landing" name={v.idFor("sort")}>
                  <Input {...v.field("sort")} type="number" inputMode="numeric" className="h-11 w-24" value={form.sort} onChange={(e) => update({ sort: Number(e.target.value) })} />
                </Field>

                {sample && form.portions > 0 && (
                  <div className="rounded-2xl bg-[#F8F7F2] p-4 text-xs text-[#1B1B1B]/60">
                    <p className="font-semibold text-[#1F4D36]">Ejemplo</p>
                    <p className="mt-1">
                      Con {Math.round(form.portions * 0.3)} platos de $19.900 y el resto al valor base: subtotal {formatPrice(sample.subtotal)} − descuento{" "}
                      {formatPrice(sample.discount)} = <strong className="text-[#1F4D36]">{formatPrice(sample.total)}</strong>.
                    </p>
                  </div>
                )}

                <Button className="w-full" type="submit" disabled={pending}>
                  {pending ? "Guardando…" : "Guardar plan"}
                </Button>
                {form.id && (
                  <Button
                    className="w-full text-red-700 hover:bg-red-50"
                    variant="ghost"
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const r = await deletePlan(form.id!);
                        notify(r);
                        if (r.ok) setForm(null);
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" /> Eliminar plan
                  </Button>
                )}
              </form>
            </Panel>
          ) : (
            <Panel title="Planes" description="Crea, edita o desactiva planes. Los cambios se ven de inmediato en la landing.">
              <p className="text-xs text-[#1B1B1B]/45">Elige un plan para editarlo.</p>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
