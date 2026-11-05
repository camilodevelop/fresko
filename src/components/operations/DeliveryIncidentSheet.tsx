"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, PackageX, X } from "lucide-react";
import { reportDeliveryIncident } from "@/app/actions/operations";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { DELIVERY_REASONS } from "@/lib/incidents";
import { notify, toast } from "@/lib/notify";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { compressPhoto } from "./photo";

/** El domiciliario no pudo entregar: motivo, qué pasó y (opcional) una foto de evidencia. */
// Solo estos motivos exigen haber avisado la llegada y esperado al cliente.
const NEEDS_WAIT = new Set(["cliente_ausente", "sin_contacto"]);

export function DeliveryIncidentSheet({
  orderId,
  code,
  waitMinutes,
  waitLeft,
  waitLabel,
  onClose,
  onDone,
}: {
  orderId: string;
  code: string;
  waitMinutes: number;
  /** null = aún no avisó que llegó; 0 = ya pasó la espera; >0 = segundos que faltan. */
  waitLeft: number | null;
  /** Texto bajo los motivos bloqueados (p. ej. "Disponible en 3:12"). */
  waitLabel: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const waitDone = waitLeft === 0;
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const ready = reason && note.trim().length >= 3;

  const pick = async (file?: File) => {
    if (!file) return;
    try {
      const blob = await compressPhoto(file);
      setPhoto(blob);
      setPreview(URL.createObjectURL(blob));
    } catch {
      toast.error("No se pudo leer la foto.");
    }
  };

  const submit = () =>
    start(async () => {
      let path: string | null = null;
      if (photo) {
        path = `${orderId}/novedad-${Date.now()}.jpg`;
        const { error } = await createClient().storage.from("delivery-proofs").upload(path, photo, { contentType: "image/jpeg" });
        if (error) {
          toast.error("No se pudo subir la foto. Intenta de nuevo o envía sin foto.");
          return;
        }
      }
      if (notify(await reportDeliveryIncident(orderId, reason, note, path))) onDone();
    });

  return (
    <Sheet
      title={`No se pudo entregar ${code}`}
      description="Elige el motivo y cuenta qué pasó. El pedido queda en espera; sigue con tu ruta y regrésalo a la cocina."
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[#1B1B1B]/50">{ready ? "Listo para registrar." : "Motivo y explicación son obligatorios."}</p>
          <Button className="bg-red-700 hover:bg-red-800" disabled={!ready || busy} onClick={submit}>
            <PackageX className="h-4 w-4" /> {busy ? "Registrando…" : "Registrar novedad"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <section>
          <p className="mb-1.5 text-xs font-semibold text-[#1B1B1B]/60">Motivo</p>
          <div className="grid grid-cols-2 gap-2">
            {DELIVERY_REASONS.map((r) => {
              const locked = NEEDS_WAIT.has(r.id) && !waitDone;
              return (
                <button
                  key={r.id}
                  type="button"
                  disabled={locked}
                  aria-pressed={reason === r.id}
                  onClick={() => setReason(r.id)}
                  className={cn(
                    "rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                    reason === r.id ? "border-red-300 bg-red-50 text-red-900" : "border-[#1F4D36]/15 text-[#1B1B1B]/70 hover:border-red-200"
                  )}
                >
                  {r.label}
                  {locked && <span className="mt-0.5 block text-[11px] font-normal tabular-nums">{waitLabel}</span>}
                </button>
              );
            })}
          </div>
          {!waitDone && (
            <p className="mt-2 text-xs text-[#1B1B1B]/50">
              &quot;El cliente no estaba&quot; y &quot;No contestó&quot; se habilitan {waitMinutes} min después de avisar que llegaste.
            </p>
          )}
        </section>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#1B1B1B]/60">¿Qué pasó?</span>
          <textarea
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej.: timbré 3 veces y llamé 2, nadie respondió. Portero no recibe."
            className="min-h-24 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200"
          />
        </label>
        <section>
          <p className="mb-1.5 text-xs font-semibold text-[#1B1B1B]/60">Foto de evidencia (opcional)</p>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ""))} />
          {preview ? (
            <div className="relative w-40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Evidencia" className="h-40 w-40 rounded-2xl object-cover" />
              <button
                type="button"
                onClick={() => (setPhoto(null), setPreview(null))}
                className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white"
                aria-label="Quitar foto"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Camera className="h-4 w-4" /> Tomar foto (portería, fachada…)
            </Button>
          )}
        </section>
      </div>
    </Sheet>
  );
}
