"use client";

import Link from "next/link";
import { AlertTriangle, Camera, ChefHat, Package, Truck } from "lucide-react";

const STAGE_ICON = {
  cocina: ChefHat,
  alistamiento: Package,
  entrega: Truck,
} as const;
import { Panel, StatusBadge } from "@/components/dashboard/ui";
import { incidentLabel, STAGE_LABEL } from "@/lib/incidents";
import type { IncidentView } from "@/lib/operations";
import { cn } from "@/lib/utils";
import { fmtClock } from "./PackingBoard";

/** Registro de novedades del día (cocina y alistamiento) con su estado. */
const STATE: Record<
  IncidentView["state"],
  { label: string; tone: "amber" | "green" | "red" | "blue" }
> = {
  por_preparar: { label: "Por preparar", tone: "amber" },
  en_espera: { label: "En espera", tone: "amber" },
  solucionado: { label: "Solucionado", tone: "green" },
  liberado: { label: "Liberado", tone: "blue" },
  cancelado: { label: "Cancelado", tone: "red" },
};

export function IncidentsPanel({
  incidents,
  description,
  linkOrders = false,
  title = "Novedades del día",
  stage,
  showStage = true,
  showKitchen = false,
}: {
  incidents: IncidentView[];
  description: string;
  linkOrders?: boolean;
  title?: string;
  /** Panel de una sola etapa: usa su ícono. */
  stage?: keyof typeof STAGE_ICON;
  /** Mostrar la cocina de cada novedad (vista de todas las cocinas). */
  showKitchen?: boolean;
  /** Mostrar la etiqueta de etapa (no hace falta si el panel ya es de una sola etapa). */
  showStage?: boolean;
}) {
  if (incidents.length === 0) return null;
  return (
    <Panel
      title={title}
      icon={stage ? STAGE_ICON[stage] : AlertTriangle}
      bodyClassName="p-0"
      description={description}
    >
      <IncidentsList
        incidents={incidents}
        linkOrders={linkOrders}
        showStage={showStage}
        showKitchen={showKitchen}
        className="mt-4 border-t"
      />
    </Panel>
  );
}

/** Lista de novedades (se usa en el panel y en la ventana de novedades de la franja). */
export function IncidentsList({
  incidents,
  linkOrders = true,
  showStage = true,
  showKitchen = false,
  className,
}: {
  incidents: IncidentView[];
  linkOrders?: boolean;
  showStage?: boolean;
  showKitchen?: boolean;
  className?: string;
}) {
  if (!incidents.length)
    return (
      <p className="py-6 text-center text-sm text-[#1B1B1B]/50">
        Sin novedades.
      </p>
    );
  return (
    <ul
      className={cn(
        "divide-y divide-[#1F4D36]/[0.06] border-[#1F4D36]/[0.06]",
        className,
      )}
    >
      {incidents.map((n) => (
        <li
          key={n.id}
          className="flex flex-wrap items-start gap-3 px-5 py-3 text-sm sm:px-6"
        >
          {linkOrders ? (
            <Link
              href={`/admin/pedidos/${n.code}`}
              className="font-display font-bold text-[#1F4D36] underline-offset-2 hover:underline"
            >
              {n.code}
            </Link>
          ) : (
            <span className="font-display font-bold text-[#1F4D36]">
              {n.code}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-[#1B1B1B]/80">
              {showStage && (
                <span className="mr-1.5 rounded-md bg-[#1B1B1B]/[0.05] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#1B1B1B]/50">
                  {STAGE_LABEL[n.stage] ?? n.stage}
                </span>
              )}
              {incidentLabel(n.reason)}
              {n.itemName && (
                <span className="font-normal text-[#1B1B1B]/55">
                  {" "}
                  · {n.quantity ? `${n.quantity} × ` : ""}
                  {n.itemName}
                </span>
              )}
            </p>
            <p className="text-[#1B1B1B]/60">{n.note}</p>
            {n.photoUrl && (
              <a
                href={n.photoUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-[#1F4D36] hover:underline"
              >
                <Camera className="h-3.5 w-3.5" /> Ver foto
              </a>
            )}
            <p className="mt-0.5 text-[11px] text-[#1B1B1B]/40">
              {showKitchen && n.kitchenName ? `${n.kitchenName} · ` : ""}
              {n.customer} · {n.slotLabel} · {fmtClock(n.createdAt)}
              {n.createdBy
                ? ` · ${n.createdBy}`
                : n.courier
                  ? ` · ${n.courier}`
                  : ""}
            </p>
          </div>
          <StatusBadge tone={STATE[n.state].tone}>
            {STATE[n.state].label}
          </StatusBadge>
        </li>
      ))}
    </ul>
  );
}
