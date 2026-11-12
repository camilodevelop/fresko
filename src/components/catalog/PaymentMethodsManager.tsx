"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Panel, fieldLabelClass } from "@/components/dashboard/ui";
import { notify } from "@/lib/notify";
import { savePaymentMethod, type PaymentMethodInput } from "@/app/admin/ajustes-venta/actions";

type Method = PaymentMethodInput & { id: string };

/** Métodos de pago presenciales (mostrador y, más adelante, puntos de venta). */
export function PaymentMethodsManager({ methods }: { methods: Method[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<PaymentMethodInput>({ name: "", kind: "digital", needsReference: false, active: true, sort: methods.length + 1 });

  const save = (m: PaymentMethodInput, after?: () => void) =>
    start(async () => {
      if (notify(await savePaymentMethod(m))) after?.();
      router.refresh();
    });

  return (
    <div className="space-y-5">
      <Panel
        title="Métodos de pago"
        description="Los que aparecen en la caja al cobrar. Los de tipo efectivo entran al cajón y cuentan en el cuadre; los digitales llegan a una cuenta."
        icon={Wallet}
        bodyClassName="p-0 sm:p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="border-y border-[#1F4D36]/[0.06] bg-[#F8F7F2] text-left text-xs text-[#1B1B1B]/50">
              <tr>
                <th className="px-5 py-2.5 font-semibold sm:px-6">Nombre</th>
                <th className="px-3 py-2.5 font-semibold">Tipo</th>
                <th className="px-3 py-2.5 font-semibold">Pide referencia</th>
                <th className="px-3 py-2.5 font-semibold">Orden</th>
                <th className="px-5 py-2.5 text-right font-semibold sm:px-6">Activo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F4D36]/[0.06]">
              {methods.map((m) => (
                <MethodRow key={m.id} method={m} disabled={pending} onSave={(next) => save(next)} />
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Agregar método" icon={Plus}>
        <form
          className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            save(draft, () => setDraft({ name: "", kind: "digital", needsReference: false, active: true, sort: methods.length + 2 }));
          }}
        >
          <div>
            <label htmlFor="pm-name" className={fieldLabelClass}>
              Nombre
            </label>
            <Input id="pm-name" className="mt-1.5" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ej. Datáfono" maxLength={40} />
          </div>
          <div>
            <label htmlFor="pm-kind" className={fieldLabelClass}>
              Tipo
            </label>
            <select
              id="pm-kind"
              className="mt-1.5 h-12 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-3 text-sm"
              value={draft.kind}
              onChange={(e) => setDraft({ ...draft, kind: e.target.value as Method["kind"] })}
            >
              <option value="digital">Digital</option>
              <option value="efectivo">Efectivo</option>
            </select>
          </div>
          <Button type="submit" disabled={pending || draft.name.trim().length < 2}>
            Agregar
          </Button>
        </form>
      </Panel>
    </div>
  );
}

function MethodRow({ method, disabled, onSave }: { method: Method; disabled: boolean; onSave: (m: Method) => void }) {
  const [name, setName] = useState(method.name);
  const [sort, setSort] = useState(String(method.sort));
  return (
    <tr className={method.active ? "" : "opacity-55"}>
      <td className="px-5 py-2.5 sm:px-6">
        <div className="flex items-center gap-2">
          {method.kind === "efectivo" ? <Banknote className="h-4 w-4 text-[#7CB342]" /> : <Wallet className="h-4 w-4 text-[#7CB342]" />}
          <Input
            aria-label="Nombre"
            className="h-9 max-w-[220px]"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() !== method.name && onSave({ ...method, name })}
          />
        </div>
      </td>
      <td className="px-3 py-2.5">
        <select
          aria-label="Tipo"
          className="h-9 rounded-xl border border-[#1F4D36]/15 bg-white px-2 text-sm"
          value={method.kind}
          disabled={disabled}
          onChange={(e) => onSave({ ...method, kind: e.target.value as Method["kind"] })}
        >
          <option value="digital">Digital</option>
          <option value="efectivo">Efectivo</option>
        </select>
      </td>
      <td className="px-3 py-2.5">
        <Switch
          size="sm"
          label="Pide referencia"
          checked={method.needsReference}
          disabled={disabled || method.kind === "efectivo"}
          onChange={(v) => onSave({ ...method, needsReference: v })}
        />
      </td>
      <td className="px-3 py-2.5">
        <Input
          aria-label="Orden"
          inputMode="numeric"
          className="h-9 w-16"
          value={sort}
          onChange={(e) => setSort(e.target.value.replace(/\D/g, ""))}
          onBlur={() => Number(sort) !== method.sort && onSave({ ...method, sort: Number(sort) })}
        />
      </td>
      <td className="px-5 py-2.5 text-right sm:px-6">
        <Switch size="sm" label="Activo" checked={method.active} disabled={disabled} onChange={(v) => onSave({ ...method, active: v })} />
      </td>
    </tr>
  );
}
