"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { setUserActive } from "./actions";

/** Estado de la cuenta: activar, o inactivar con motivo y confirmación. */
export function UserStatusCard({
  userId,
  active,
  isMe,
  deactivatedAt,
  reason,
  by,
}: {
  userId: string;
  active: boolean;
  isMe: boolean;
  deactivatedAt: string | null;
  reason: string | null;
  by: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, start] = useTransition();
  const run = (next: boolean) =>
    start(async () => {
      if (notify(await setUserActive(userId, next, note))) {
        setOpen(false);
        setNote("");
        router.refresh();
      }
    });
  const fmt = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });

  return (
    <section className={cn("rounded-3xl border p-5", active ? "border-[#1F4D36]/[0.07] bg-white" : "border-red-200 bg-red-50")}>
      <p className={cn("flex items-center gap-2 font-display font-bold", active ? "text-[#1F4D36]" : "text-red-800")}>
        {active ? <Power className="h-5 w-5 text-[#7CB342]" /> : <PowerOff className="h-5 w-5" />}
        {active ? "Cuenta activa" : "Cuenta inactiva"}
      </p>
      {active ? (
        <p className="mt-1 text-sm text-[#1B1B1B]/60">Puede ingresar y usar lo que le permiten sus roles.</p>
      ) : (
        <div className="mt-1 text-sm text-red-900/80">
          <p>No puede ingresar y no tiene permisos. Sus roles, pedidos e historial se conservan.</p>
          {reason && <p className="mt-2 rounded-xl bg-white/70 px-3 py-2">Motivo: {reason}</p>}
          {deactivatedAt && (
            <p className="mt-1 text-xs text-red-900/60">
              Desde {fmt.format(new Date(deactivatedAt))}
              {by ? ` · por ${by}` : ""}
            </p>
          )}
        </div>
      )}

      {isMe ? (
        <p className="mt-3 text-xs text-[#1B1B1B]/45">No puedes inactivar tu propia cuenta.</p>
      ) : active ? (
        open ? (
          <div className="mt-3 space-y-2">
            <textarea
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Motivo (obligatorio). Ej.: ya no trabaja con nosotros."
              className="min-h-20 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200"
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button className="bg-red-700 hover:bg-red-800" disabled={busy || note.trim().length < 3} onClick={() => run(false)}>
                <PowerOff className="h-4 w-4" /> {busy ? "Inactivando…" : "Inactivar cuenta"}
              </Button>
            </div>
            <p className="text-xs text-[#1B1B1B]/45">Se cierran sus sesiones abiertas al instante.</p>
          </div>
        ) : (
          <Button variant="ghost" className="mt-3 text-red-700 hover:bg-red-50" onClick={() => setOpen(true)}>
            <PowerOff className="h-4 w-4" /> Inactivar
          </Button>
        )
      ) : (
        <Button className="mt-3" disabled={busy} onClick={() => run(true)}>
          <Power className="h-4 w-4" /> {busy ? "Activando…" : "Activar cuenta"}
        </Button>
      )}
    </section>
  );
}
