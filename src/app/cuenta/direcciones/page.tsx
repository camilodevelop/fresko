import { Home, MapPin, Plus, Star } from "lucide-react";
import { PageHeader, PreviewNotice, StatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { PREVIEW_ADDRESSES } from "@/lib/data/account-preview";

export default function DireccionesPage() {
  return (
    <div>
      <PreviewNotice>Vista previa con datos de ejemplo. Guardar direcciones llega con los pedidos (fase 3).</PreviewNotice>
      <PageHeader
        eyebrow="Entregas"
        title="Mis direcciones"
        description="Solo puedes recibir en direcciones dentro de una zona de cobertura."
        actions={
          <Button size="sm" disabled>
            <Plus className="h-4 w-4" /> Agregar dirección
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {PREVIEW_ADDRESSES.map((a) => (
          <article
            key={a.label}
            className={`rounded-3xl bg-white p-6 ${a.primary ? "ring-2 ring-[#8BC34A]" : "ring-1 ring-[#1F4D36]/[0.07]"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4F8F2] text-[#1F4D36]">
                {a.label === "Casa" ? <Home className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
              </span>
              {a.primary && (
                <StatusBadge tone="green" dot={false}>
                  <Star className="h-3 w-3" /> Principal
                </StatusBadge>
              )}
            </div>
            <p className="mt-4 font-display text-lg font-bold text-[#1F4D36]">{a.label}</p>
            <p className="text-sm text-[#1B1B1B]/70">{a.address}</p>
            <p className="text-sm text-[#1B1B1B]/45">{a.detail}</p>
            <div className="mt-4 flex items-center gap-2 border-t border-[#1F4D36]/[0.06] pt-4 text-xs text-[#1B1B1B]/50">
              <span className="h-2 w-2 rounded-full bg-[#8BC34A]" /> En cobertura · {a.zone}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
