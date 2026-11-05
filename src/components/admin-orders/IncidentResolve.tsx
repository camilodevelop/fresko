"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCcw, XCircle } from "lucide-react";
import { resolveIncident } from "@/app/actions/operations";
import { Button } from "@/components/ui/button";
import { incidentLabel, STAGE_LABEL } from "@/lib/incidents";
import { notify } from "@/lib/notify";

type Incident = { stage: string; item_name: string | null; quantity: number | null; photoUrl?: string | null; reason: string; note: string; created_at: string; resolution: string | null };

/** Novedad (cocina o alistamiento) en el detalle del pedido: liberar para otra ruta o cancelar. */
export function IncidentResolve({
  orderId,
  status,
  onHold,
  incidents,
  canManage,
}: {
  orderId: string;
  status: string;
  onHold: boolean;
  incidents: Incident[];
  canManage: boolean;
}) {
  const notDelivered = status === "no_entregado";
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  if (!incidents.length) return null;
  const fmt = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });
  const run = (resolution: "liberado" | "cancelado") =>
    start(async () => {
      notify(await resolveIncident(orderId, resolution));
      router.refresh();
    });

  return (
    <section className={onHold ? "rounded-3xl border border-amber-200 bg-amber-50 p-5" : "rounded-3xl border border-[#1F4D36]/[0.07] bg-white p-5"}>
      <p className="flex items-center gap-2 font-display font-bold text-amber-900">
        <AlertTriangle className="h-5 w-5" /> {onHold ? "Pedido en espera por una novedad" : "Novedades"}
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        {[...incidents]
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map((n, i) => (
            <li key={i} className="rounded-2xl bg-white/70 px-3 py-2">
              <p className="font-semibold text-[#1B1B1B]/80">
                {STAGE_LABEL[n.stage] ?? n.stage} · {incidentLabel(n.reason)}
                {n.item_name && <span className="font-normal text-[#1B1B1B]/55"> · {n.quantity ? `${n.quantity} × ` : ""}{n.item_name}</span>}
              </p>
              <p className="text-[#1B1B1B]/65">{n.note}</p>
              {n.photoUrl && (
                <a href={n.photoUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={n.photoUrl} alt="Evidencia" className="h-20 w-20 rounded-xl object-cover" />
                </a>
              )}
              <p className="text-[11px] text-[#1B1B1B]/40">
                {fmt.format(new Date(n.created_at))}
                {n.resolution
                  ? ` · ${n.resolution === "liberado" ? "Liberado para nueva ruta" : n.resolution === "solucionado" ? "Solucionado: se prepararon los faltantes" : "Cancelado"}`
                  : n.stage === "cocina"
                    ? " · Faltantes por preparar en cocina"
                    : ""}
              </p>
            </li>
          ))}
      </ul>
      {onHold && canManage && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={pending} onClick={() => run("liberado")}>
            <RotateCcw className="h-4 w-4" /> {notDelivered ? "Nuevo intento de entrega" : "Liberar para una nueva ruta"}
          </Button>
          <Button
            variant="ghost"
            className="text-red-700 hover:bg-red-50"
            disabled={pending}
            onClick={() => (confirmCancel ? run("cancelado") : setConfirmCancel(true))}
          >
            <XCircle className="h-4 w-4" /> {confirmCancel ? "¿Seguro? Toca para cancelar" : "Cancelar pedido"}
          </Button>
        </div>
      )}
      {onHold && (
        <p className="mt-3 text-xs text-amber-900/70">Mientras esté en espera, no entra al calcular rutas. Al liberarlo, aparece como “sin ruta” en Alistamiento.</p>
      )}
    </section>
  );
}
