"use client";

import { useState, useTransition } from "react";
import { Store } from "lucide-react";
import { Panel } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { setUserKitchens } from "./actions";

/** Cocinas de la persona: solo verá pedidos, inventario y cuentas de estas cocinas. */
export function UserKitchens({
  userId,
  kitchens,
  assigned,
  locked,
  superadmin,
}: {
  userId: string;
  kitchens: { id: string; name: string }[];
  assigned: string[];
  locked: boolean;
  superadmin: boolean;
}) {
  const [sel, setSel] = useState(new Set(assigned));
  const [busy, start] = useTransition();
  const dirty = sel.size !== assigned.length || assigned.some((k) => !sel.has(k));
  return (
    <Panel
      icon={Store}
      title="Cocinas"
      description={superadmin ? "Superadministrador: ve todas las cocinas." : "Solo ve la información de las cocinas marcadas."}
    >
      {superadmin ? null : (
        <>
          <div className="mt-3 space-y-2">
            {kitchens.map((k) => (
              <label
                key={k.id}
                className={cn("flex cursor-pointer items-center gap-2.5 rounded-xl bg-[#F8F7F2] px-3 py-2 text-sm font-medium text-[#1B1B1B]/70", locked && "cursor-default opacity-60")}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#1F4D36]"
                  checked={sel.has(k.id)}
                  disabled={locked || busy}
                  onChange={(e) => {
                    const n = new Set(sel);
                    if (e.target.checked) n.add(k.id);
                    else n.delete(k.id);
                    setSel(n);
                  }}
                />
                {k.name}
              </label>
            ))}
          </div>
          {sel.size === 0 && <p className="mt-2 text-xs font-semibold text-amber-700">Sin cocina: no verá información de ninguna.</p>}
          {locked ? (
            <p className="mt-2 text-xs text-[#1B1B1B]/50">Solo el superadministrador cambia las cocinas de un administrador.</p>
          ) : (
            dirty && (
              <Button className="mt-3 w-full" disabled={busy} onClick={() => start(async () => void notify(await setUserKitchens(userId, [...sel])))}>
                {busy ? "Guardando…" : "Guardar cocinas"}
              </Button>
            )
          )}
        </>
      )}
    </Panel>
  );
}
