"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { removePay, savePay } from "@/app/admin/cuentas/actions";
import { Panel, StatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { cn, formatPrice } from "@/lib/utils";

type Row = {
  id: string;
  name: string;
  roles: string;
  active: boolean;
  pay: {
    kitchen_id: string | null;
    pay_type: string;
    amount: number;
    active: boolean;
    starts_on: string;
  } | null;
};

/** Días de trabajo de referencia para estimar el costo mensual de un pago por día. */
const REF_DAYS = 26;

/** Pago de cada persona del equipo: por día (× días con actividad) o mensual, y su cocina. */
export function PayrollManager({
  rows,
  kitchens,
  monthStart,
  allowGeneral = true,
}: {
  rows: Row[];
  kitchens: { id: string; name: string }[];
  monthStart: string;
  allowGeneral?: boolean;
}) {
  const monthly = rows
    .filter((r) => r.pay?.active)
    .reduce(
      (s, r) =>
        s +
        (r.pay!.pay_type === "diario"
          ? r.pay!.amount * REF_DAYS
          : r.pay!.amount),
      0,
    );
  return (
    <Panel
      icon={Users}
      title="Nómina"
      bodyClassName="p-0"
      description={`El pago por día se cuenta por los días con actividad real de la persona (tandas, empaques o rutas). Estimado actual: ${formatPrice(monthly)} al mes (${REF_DAYS} días para pagos por día).`}
    >
      <ul className="mt-4 divide-y divide-[#1F4D36]/[0.06] border-t border-[#1F4D36]/[0.06]">
        {rows.map((r) => (
          <PayRow
            key={r.id}
            row={r}
            kitchens={kitchens}
            allowGeneral={allowGeneral}
            monthStart={monthStart}
          />
        ))}
      </ul>
      {rows.length === 0 && (
        <p className="px-6 pb-5 text-sm text-[#1B1B1B]/50">
          Aún no hay personas con rol de cocina o domicilios.
        </p>
      )}
    </Panel>
  );
}

function PayRow({
  row: r,
  kitchens,
  monthStart,
  allowGeneral = true,
}: {
  row: Row;
  kitchens: { id: string; name: string }[];
  monthStart: string;
  allowGeneral: boolean;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [kitchenId, setKitchenId] = useState<string>(
    r.pay?.kitchen_id ?? kitchens[0]?.id ?? "",
  );
  const [payType, setPayType] = useState<"diario" | "mensual">(
    (r.pay?.pay_type as "diario" | "mensual") ?? "diario",
  );
  const [amount, setAmount] = useState(r.pay ? String(r.pay.amount) : "");
  const [active, setActive] = useState(r.pay?.active ?? true);
  const [startsOn, setStartsOn] = useState(r.pay?.starts_on ?? monthStart);
  const n = Number(amount.replace(/\D/g, ""));
  const dirty =
    !r.pay ||
    r.pay.kitchen_id !== (kitchenId || null) ||
    r.pay.pay_type !== payType ||
    r.pay.amount !== n ||
    r.pay.active !== active ||
    r.pay.starts_on !== startsOn;
  const control =
    "h-10 rounded-xl border border-[#1F4D36]/15 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#8BC34A]/50";
  const run = (fn: () => Promise<{ ok?: string; error?: string }>) =>
    start(async () => {
      notify(await fn());
      router.refresh();
    });

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-3 px-5 py-3 sm:px-6",
        !r.active && "opacity-60",
      )}
    >
      <div className="min-w-0 flex-1 basis-48">
        <p className="font-semibold text-[#1F4D36]">
          {r.name} {!r.active && <StatusBadge tone="red">Inactivo</StatusBadge>}
        </p>
        <p className="text-xs text-[#1B1B1B]/50">
          {r.roles || "Sin rol de operación"}
        </p>
      </div>
      <select
        className={control}
        value={kitchenId}
        onChange={(e) => setKitchenId(e.target.value)}
        aria-label="Cocina"
      >
        {allowGeneral && <option value="">General</option>}
        {kitchens.map((k) => (
          <option key={k.id} value={k.id}>
            {k.name}
          </option>
        ))}
      </select>
      <select
        className={control}
        value={payType}
        onChange={(e) => setPayType(e.target.value as "diario" | "mensual")}
        aria-label="Tipo de pago"
      >
        <option value="diario">Por día</option>
        <option value="mensual">Mensual</option>
      </select>
      <input
        className={cn(control, "w-36")}
        inputMode="numeric"
        placeholder={payType === "diario" ? "$ por día" : "$ al mes"}
        value={amount ? formatPrice(n) : ""}
        onChange={(e) => setAmount(e.target.value)}
        aria-label="Valor"
      />
      <label className="flex items-center gap-1.5 text-xs text-[#1B1B1B]/60">
        Desde
        <input
          type="date"
          className={cn(control, "w-36")}
          value={startsOn}
          onChange={(e) => setStartsOn(e.target.value)}
        />
      </label>
      <label className="flex items-center gap-1.5 text-xs text-[#1B1B1B]/60">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
        />{" "}
        Activo
      </label>
      <div className="flex gap-1">
        <Button
          size="sm"
          disabled={busy || !n || !dirty}
          onClick={() =>
            run(() =>
              savePay({
                userId: r.id,
                kitchenId: kitchenId || null,
                payType,
                amount: n,
                active,
                startsOn,
              }),
            )
          }
        >
          {busy ? "Guardando…" : "Guardar"}
        </Button>
        {r.pay && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => run(() => removePay(r.id))}
          >
            Quitar
          </Button>
        )}
      </div>
    </li>
  );
}
