"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { deleteEntry, endRecurring, saveEntry, type EntryInput } from "@/app/admin/cuentas/actions";
import { Panel, StatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/finance-categories";
import { notify } from "@/lib/notify";
import { cn, formatPrice } from "@/lib/utils";

type Entry = {
  id: string;
  kitchen_id: string | null;
  kind: string;
  category: string;
  description: string;
  amount: number;
  entry_date: string;
  recurring: boolean;
  ends_on: string | null;
};

const fmtDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** Gastos fijos (recurrentes), gastos y otros ingresos, por cocina o generales. */
export function EntriesManager({ entries, kitchens, today, allowGeneral = true }: { entries: Entry[]; kitchens: { id: string; name: string }[]; today: string; allowGeneral?: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<EntryInput | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const kitchenName = (id: string | null) => (id ? (kitchens.find((k) => k.id === id)?.name ?? "Cocina") : "General");
  const recurring = entries.filter((e) => e.recurring && (!e.ends_on || e.ends_on >= today));
  const others = entries.filter((e) => !recurring.includes(e));
  const monthlyFixed = recurring.filter((e) => e.kind === "egreso").reduce((s, e) => s + e.amount, 0);

  const blank = (recurringDefault: boolean): EntryInput => ({
    kitchenId: kitchens.length === 1 || !allowGeneral ? (kitchens[0]?.id ?? null) : null,
    kind: "egreso",
    category: recurringDefault ? "arriendo" : "imprevistos",
    description: "",
    amount: 0,
    date: recurringDefault ? `${today.slice(0, 8)}01` : today,
    recurring: recurringDefault,
    endsOn: null,
  });
  const edit = (e: Entry) =>
    setForm({
      id: e.id,
      kitchenId: e.kitchen_id,
      kind: e.kind as "egreso" | "ingreso",
      category: e.category as ExpenseCategory,
      description: e.description,
      amount: e.amount,
      date: e.entry_date,
      recurring: e.recurring,
      endsOn: e.ends_on,
    });
  const run = (fn: () => Promise<{ ok?: string; error?: string }>, after?: () => void) =>
    start(async () => {
      if (notify(await fn())) after?.();
      router.refresh();
    });

  const row = (e: Entry) => (
    <li key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm sm:px-6">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[#1F4D36]">{e.description}</p>
        <p className="text-xs text-[#1B1B1B]/50">
          {EXPENSE_CATEGORIES[e.category as ExpenseCategory] ?? e.category} · {kitchenName(e.kitchen_id)} ·{" "}
          {e.recurring ? `cada mes desde ${fmtDate(e.entry_date)}${e.ends_on ? ` hasta ${fmtDate(e.ends_on)}` : ""}` : fmtDate(e.entry_date)}
        </p>
      </div>
      <span className={cn("font-semibold tabular-nums", e.kind === "ingreso" ? "text-[#2E6B1F]" : "text-[#1B1B1B]")}>
        {e.kind === "ingreso" ? "+" : "−"}
        {formatPrice(e.amount)}
        {e.recurring && <span className="text-xs font-normal text-[#1B1B1B]/45"> /mes</span>}
      </span>
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => edit(e)}>
          <Pencil className="h-4 w-4" />
        </Button>
        {e.recurring && !e.ends_on && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => endRecurring(e.id, today))} title="Deja de contar desde mañana">
            Terminar
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="text-red-700 hover:bg-red-50"
          aria-label="Eliminar"
          disabled={busy}
          onClick={() => (confirm === e.id ? run(() => deleteEntry(e.id), () => setConfirm(null)) : setConfirm(e.id))}
          title={confirm === e.id ? "Toca otra vez para eliminar" : "Eliminar"}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );

  return (
    <div className="space-y-6">
      <Panel
        icon={Repeat}
        title="Gastos fijos (cada mes)"
        description={`Arriendo, servicios, software… Se reparten por día en los reportes. Hoy suman ${formatPrice(monthlyFixed)} al mes.`}
        bodyClassName="p-0"
        actions={
          <Button size="sm" onClick={() => setForm(blank(true))}>
            <Plus className="h-4 w-4" /> Gasto fijo
          </Button>
        }
      >
        {recurring.length ? (
          <ul className="mt-4 divide-y divide-[#1F4D36]/[0.06] border-t border-[#1F4D36]/[0.06]">{recurring.map(row)}</ul>
        ) : (
          <p className="px-5 pb-5 pt-2 text-sm text-[#1B1B1B]/50 sm:px-6">Aún no hay gastos fijos.</p>
        )}
      </Panel>
      <Panel
        title="Registrar gastos y otros ingresos"
        description="Gastos de una sola vez (reparaciones, compras extra…) e ingresos que no son ventas."
        bodyClassName="p-0"
        actions={
          <Button size="sm" variant="secondary" onClick={() => setForm(blank(false))}>
            <Plus className="h-4 w-4" /> Registrar
          </Button>
        }
      >
        {others.length ? (
          <ul className="mt-4 divide-y divide-[#1F4D36]/[0.06] border-t border-[#1F4D36]/[0.06]">{others.map(row)}</ul>
        ) : (
          <p className="px-5 pb-5 pt-2 text-sm text-[#1B1B1B]/50 sm:px-6">Sin movimientos.</p>
        )}
      </Panel>

      {form && (
        <EntrySheet
          value={form}
          kitchens={kitchens}
          allowGeneral={allowGeneral}
          busy={busy}
          onClose={() => setForm(null)}
          onSave={(v) => run(() => saveEntry(v), () => setForm(null))}
        />
      )}
    </div>
  );
}

function EntrySheet({
  value,
  kitchens,
  busy,
  onClose,
  onSave,
  allowGeneral,
}: {
  value: EntryInput;
  kitchens: { id: string; name: string }[];
  allowGeneral: boolean;
  busy: boolean;
  onClose: () => void;
  onSave: (v: EntryInput) => void;
}) {
  const [v, setV] = useState(value);
  const [amount, setAmount] = useState(value.amount ? String(value.amount) : "");
  const set = (patch: Partial<EntryInput>) => setV((x) => ({ ...x, ...patch }));
  const n = Number(amount.replace(/\D/g, ""));
  const categories = (Object.keys(EXPENSE_CATEGORIES) as ExpenseCategory[]).filter((c) => (v.kind === "ingreso" ? c === "otros_ingresos" : c !== "otros_ingresos"));
  const ok = v.description.trim().length >= 2 && n > 0 && v.date;
  const input = "h-11 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-4 text-sm outline-none focus:ring-2 focus:ring-[#8BC34A]/50";

  return (
    <Sheet
      title={v.id ? "Editar movimiento" : v.recurring ? "Nuevo gasto fijo" : v.kind === "ingreso" ? "Nuevo ingreso" : "Nuevo gasto"}
      description={v.recurring ? "Se cuenta cada mes desde la fecha de inicio, repartido por día." : "Se cuenta el día indicado."}
      onClose={onClose}
      footer={
        <div className="flex justify-end">
          <Button disabled={!ok || busy} onClick={() => onSave({ ...v, amount: n })}>
            {busy ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        {!v.recurring && (
          <div className="flex gap-1 rounded-full bg-[#F4F8F2] p-1">
            {(["egreso", "ingreso"] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={v.kind === k}
                onClick={() => set({ kind: k, category: k === "ingreso" ? "otros_ingresos" : "imprevistos" })}
                className={cn("flex-1 rounded-full py-2 font-semibold", v.kind === k ? "bg-white text-[#1F4D36] shadow" : "text-[#1F4D36]/60")}
              >
                {k === "egreso" ? "Gasto" : "Ingreso"}
              </button>
            ))}
          </div>
        )}
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#1B1B1B]/60">Descripción</span>
          <input className={input} value={v.description} maxLength={200} onChange={(e) => set({ description: e.target.value })} placeholder="Ej.: Arriendo local Fontibón" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#1B1B1B]/60">Categoría</span>
            <select className={input} value={v.category} onChange={(e) => set({ category: e.target.value as ExpenseCategory })}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {EXPENSE_CATEGORIES[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#1B1B1B]/60">Cocina</span>
            <select className={input} value={v.kitchenId ?? ""} onChange={(e) => set({ kitchenId: e.target.value || null })}>
              {allowGeneral && <option value="">General (todas)</option>}
              {kitchens.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#1B1B1B]/60">{v.recurring ? "Valor mensual" : "Valor"}</span>
            <input className={input} inputMode="numeric" value={amount ? formatPrice(n) : ""} onChange={(e) => setAmount(e.target.value)} placeholder="$ 0" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[#1B1B1B]/60">{v.recurring ? "Desde" : "Fecha"}</span>
            <input type="date" className={input} value={v.date} onChange={(e) => set({ date: e.target.value })} />
          </label>
          {v.recurring && (
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-[#1B1B1B]/60">Hasta (opcional)</span>
              <input type="date" className={input} value={v.endsOn ?? ""} min={v.date} onChange={(e) => set({ endsOn: e.target.value || null })} />
            </label>
          )}
        </div>
        {v.recurring && <StatusBadge tone="gray">Se repite cada mes</StatusBadge>}
      </div>
    </Sheet>
  );
}
