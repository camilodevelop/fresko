"use client";

import { useEffect, useState } from "react";
import {
  BellRing,
  Camera,
  CheckCircle2,
  Clock,
  MapPin,
  PackageX,
  Phone,
  StickyNote,
  Timer,
} from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { incidentLabel } from "@/lib/incidents";
import type { RouteStopView } from "@/lib/operations";
import { formatPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { fmtClock } from "./PackingBoard";

const minutesBetween = (a: string | null, b: string | null) =>
  a && b
    ? Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000)
    : null;
const fmtMins = (m: number) =>
  Math.abs(m) >= 60
    ? `${Math.floor(Math.abs(m) / 60)} h ${Math.abs(m) % 60} min`
    : `${Math.abs(m)} min`;

/** Detalle de una entrega del historial: pedido, tiempos (estimado, llegada, espera, cierre) y evidencia. */
export function StopDetailSheet({
  stop: s,
  onClose,
}: {
  stop: RouteStopView;
  onClose: () => void;
}) {
  const failed = s.status === "no_entregado";
  const closedAt = failed ? (s.deliveryIncident?.at ?? null) : s.deliveredAt;
  const wait = minutesBetween(s.arrivedAt, closedAt);
  // Llegada frente a lo estimado (solo si avisó la llegada; diferencias de horas son de pruebas en otro día).
  const rawLate = minutesBetween(s.eta, s.arrivedAt);
  const late = rawLate !== null && Math.abs(rawLate) <= 360 ? rawLate : null;
  const photoPath = failed ? s.deliveryIncident?.photoPath : s.photoPath;
  const [photo, setPhoto] = useState<string | null>(null);

  // Las fotos están en un bucket privado: se pide un enlace temporal al abrir el detalle.
  useEffect(() => {
    if (!photoPath) return;
    let alive = true;
    createClient()
      .storage.from("delivery-proofs")
      .createSignedUrl(photoPath, 600)
      .then(({ data }) => alive && setPhoto(data?.signedUrl ?? null));
    return () => {
      alive = false;
    };
  }, [photoPath]);

  const rows: {
    icon: typeof Clock;
    label: string;
    value: string;
    hint?: string;
    tone?: "ok" | "warn" | "bad";
  }[] = [
    {
      icon: Clock,
      label: "Hora estimada",
      value: s.eta ? fmtClock(s.eta) : "—",
    },
    {
      icon: BellRing,
      label: "Llegó y avisó al cliente",
      value: s.arrivedAt ? fmtClock(s.arrivedAt) : "No avisó la llegada",
      hint:
        late === null
          ? undefined
          : late > 2
            ? `${fmtMins(late)} tarde`
            : late < -2
              ? `${fmtMins(late)} antes`
              : "a tiempo",
      tone:
        late === null
          ? undefined
          : late > 10
            ? "bad"
            : late > 2
              ? "warn"
              : "ok",
    },
    {
      icon: Timer,
      label: failed ? "Esperó al cliente" : "Esperó hasta entregar",
      value: wait === null ? "—" : fmtMins(Math.max(0, wait)),
    },
    failed
      ? {
          icon: PackageX,
          label: "Reportó la novedad",
          value: closedAt ? fmtClock(closedAt) : "—",
          tone: "bad" as const,
        }
      : {
          icon: CheckCircle2,
          label: "Entregado",
          value: closedAt ? fmtClock(closedAt) : "—",
          tone: "ok" as const,
        },
  ];

  return (
    <Sheet
      title={`${s.code} · parada ${s.position}`}
      description={`${s.customer} · ${failed ? "No entregado" : s.status === "entregado" ? "Entregado" : "Cancelado"}`}
      onClose={onClose}
    >
      <div className="space-y-5">
        {/* Tiempos */}
        <section className="rounded-2xl bg-[#F8F7F2] p-4">
          <ol className="space-y-3">
            {rows.map((r) => (
              <li key={r.label} className="flex items-center gap-3 text-sm">
                <r.icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    r.tone === "bad"
                      ? "text-red-600"
                      : r.tone === "ok"
                        ? "text-[#7CB342]"
                        : "text-[#1F4D36]/50",
                  )}
                />
                <span className="min-w-0 flex-1 text-[#1B1B1B]/60">
                  {r.label}
                </span>
                <span className="text-right font-semibold tabular-nums text-[#1F4D36]">
                  {r.value}
                  {r.hint && (
                    <span
                      className={cn(
                        "block text-[11px] font-normal",
                        r.tone === "bad"
                          ? "text-red-600"
                          : r.tone === "warn"
                            ? "text-amber-700"
                            : "text-[#2E6B1F]",
                      )}
                    >
                      {r.hint}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* Novedad */}
        {failed && s.deliveryIncident && (
          <section className="rounded-2xl bg-red-50 p-4 text-sm text-red-900">
            <p className="font-semibold">
              {incidentLabel(s.deliveryIncident.reason)}
            </p>
            <p className="mt-0.5 text-red-900/80">{s.deliveryIncident.note}</p>
          </section>
        )}

        {/* Pedido */}
        <section>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/40">
            Pedido
          </p>
          <ul className="divide-y divide-[#1F4D36]/[0.06] rounded-2xl border border-[#1F4D36]/10">
            {s.items.map((it, i) => (
              <li key={i} className="px-3 py-2 text-sm">
                <span className="font-semibold text-[#1F4D36]">
                  {it.quantity}× {it.name}
                </span>
                {it.options.length > 0 && (
                  <span className="block text-xs text-[#1B1B1B]/50">
                    {it.options.join(", ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {s.notes && (
            <p className="mt-2 flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <StickyNote className="h-3.5 w-3.5 shrink-0" /> {s.notes}
            </p>
          )}
        </section>

        {/* Cliente */}
        <section className="space-y-1.5 text-sm text-[#1B1B1B]/70">
          <p className="flex gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#1F4D36]/50" />
            <span>
              {s.address}
              {s.details && (
                <span className="block text-xs text-[#1B1B1B]/50">
                  {s.details}
                </span>
              )}
            </span>
          </p>
          {s.phone && (
            <a
              href={`tel:${s.phone}`}
              className="flex items-center gap-2 hover:text-[#1F4D36]"
            >
              <Phone className="h-4 w-4 text-[#1F4D36]/50" />{" "}
              {formatPhone(s.phone)}
            </a>
          )}
        </section>

        {/* Evidencia */}
        {photoPath && (
          <section>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/40">
              <Camera className="h-3.5 w-3.5" />{" "}
              {failed ? "Foto de la novedad" : "Foto de la entrega"}
            </p>
            {photo ? (
              <a href={photo} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo}
                  alt="Evidencia"
                  className="max-h-72 w-full rounded-2xl object-cover"
                />
              </a>
            ) : (
              <div className="h-48 animate-pulse rounded-2xl bg-[#F4F8F2]" />
            )}
          </section>
        )}
      </div>
    </Sheet>
  );
}
