"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tags } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/dashboard/ui";
import { notify } from "@/lib/notify";
import { cn, formatPrice } from "@/lib/utils";
import { setChannelPrice } from "@/app/admin/ajustes-venta/actions";

type Row = { id: string; name: string; category: string; builder: boolean; active: boolean; web: number; mostrador: number | null; punto: number | null };

/** Precio distinto por canal; vacío = el mismo de la web. */
export function ChannelPricesManager({ rows }: { rows: Row[] }) {
  return (
    <Panel
      title="Precios por canal"
      description="Deja vacío para usar el precio de la web. En los productos para armar, el precio es la base: las opciones suman lo mismo en todos los canales."
      icon={Tags}
      bodyClassName="p-0 sm:p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="border-y border-[#1F4D36]/[0.06] bg-[#F8F7F2] text-left text-xs text-[#1B1B1B]/50">
            <tr>
              <th className="px-5 py-2.5 font-semibold sm:px-6">Producto</th>
              <th className="px-3 py-2.5 text-right font-semibold">Web y domicilio</th>
              <th className="px-3 py-2.5 font-semibold">Mostrador</th>
              <th className="px-5 py-2.5 font-semibold sm:px-6">Puntos de venta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F4D36]/[0.06]">
            {rows.map((r) => (
              <tr key={r.id} className={r.active ? "" : "opacity-50"}>
                <td className="px-5 py-2.5 sm:px-6">
                  <p className="font-semibold text-[#1F4D36]">{r.name}</p>
                  <p className="text-xs text-[#1B1B1B]/45">
                    {r.category}
                    {r.builder && " · base del armador"}
                    {!r.active && " · inactivo"}
                  </p>
                </td>
                <td className="px-3 py-2.5 text-right font-semibold">{formatPrice(r.web)}</td>
                <td className="px-3 py-2.5">
                  <PriceCell productId={r.id} channel="mostrador" value={r.mostrador} web={r.web} />
                </td>
                <td className="px-5 py-2.5 sm:px-6">
                  <PriceCell productId={r.id} channel="punto" value={r.punto} web={r.web} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function PriceCell({ productId, channel, value, web }: { productId: string; channel: "mostrador" | "punto"; value: number | null; web: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState(value ? new Intl.NumberFormat("es-CO").format(value) : "");
  const n = Number(text.replace(/\D/g, "") || 0);
  const save = () => {
    const next = n > 0 ? n : null;
    if (next === value) return;
    start(async () => {
      notify(await setChannelPrice(productId, channel, next));
      router.refresh();
    });
  };
  const diff = n > 0 ? n - web : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#1B1B1B]/40">$</span>
        <Input
          aria-label={`Precio ${channel}`}
          inputMode="numeric"
          disabled={pending}
          className="h-9 w-32 pl-6"
          placeholder={new Intl.NumberFormat("es-CO").format(web)}
          value={text}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "");
            setText(d ? new Intl.NumberFormat("es-CO").format(Number(d)) : "");
          }}
          onBlur={save}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
      </div>
      {diff !== 0 && (
        <span className={cn("text-xs font-semibold", diff > 0 ? "text-[#2E6B1F]" : "text-amber-700")}>
          {diff > 0 ? "+" : "−"}
          {formatPrice(Math.abs(diff))}
        </span>
      )}
    </div>
  );
}
