import { forbidden } from "next/navigation";
import { AlertTriangle, ChefHat, Package, Truck } from "lucide-react";
import { EmptyState, PageHeader, StatCard } from "@/components/dashboard/ui";
import { DayPicker } from "@/components/operations/DayPicker";
import { IncidentsPanel } from "@/components/operations/IncidentsPanel";
import { loadIncidents, loadKitchens } from "@/lib/operations";
import { requireConsentedSession } from "@/lib/supabase/auth";
import { todayBogota } from "@/lib/subscriptions";

const SECTIONS = [
  { stage: "cocina", title: "Cocina", description: "Platos que no se pudieron preparar. Por preparar: cocina aún puede hacer los faltantes." },
  {
    stage: "alistamiento",
    title: "Alistamiento",
    description: "Pedidos que no se pudieron empacar: salieron de la ruta y el equipo de pedidos decide si se liberan o se cancelan.",
  },
  {
    stage: "entrega",
    title: "Entregas",
    description: "Pedidos que el domiciliario no pudo entregar: regresan a la cocina y el equipo de pedidos decide un nuevo intento o cancelar.",
  },
] as const;

export default async function NovedadesPage({ searchParams }: { searchParams: Promise<{ fecha?: string; cocina?: string }> }) {
  const session = await requireConsentedSession("/admin");
  if (!session.permissions.has("kitchen.prepare") && !session.permissions.has("orders.view")) forbidden();
  const { fecha, cocina } = await searchParams;
  const today = todayBogota();
  const date = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : today;
  const kitchens = (await loadKitchens()).filter((k) => k.active);
  // Por defecto todas las cocinas: una novedad no se pierde por estar mirando otra cocina.
  const kitchen = kitchens.find((k) => k.id === cocina) ?? null;
  const incidents = kitchens.length ? await loadIncidents(kitchen?.id ?? null, date) : [];
  const open = incidents.filter((n) => n.state === "por_preparar" || n.state === "en_espera").length;
  const byStage = (stage: string) => incidents.filter((n) => n.stage === stage);

  return (
    <div>
      <PageHeader
        eyebrow="Operación"
        title="Novedades"
        description="Registro de lo que no se pudo preparar, empacar o entregar, con el motivo, quién lo reportó y cómo se resolvió."
      />
      {!kitchens.length ? (
        <EmptyState icon={AlertTriangle} title="No hay cocinas activas" description="Crea una en Configuración → Operación." />
      ) : (
        <>
          <DayPicker base="/admin/novedades" date={date} today={today} kitchens={kitchens} kitchenId={kitchen?.id ?? "todas"} allowAll />
          {incidents.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title={`Sin novedades este día${kitchen ? ` en ${kitchen.name}` : ""}`}
              description="Se buscan por el día de entrega del pedido. Cuando cocina, alistamiento o un domiciliario reporten algo, aparece aquí."
            />
          ) : (
            <>
              <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={AlertTriangle} tone={open ? "fresh" : "default"} label="Abiertas" value={String(open)} />
                <StatCard icon={ChefHat} label="En cocina" value={String(byStage("cocina").length)} />
                <StatCard icon={Package} label="En alistamiento" value={String(byStage("alistamiento").length)} />
                <StatCard icon={Truck} label="En entregas" value={String(byStage("entrega").length)} />
              </div>
              <div className="space-y-6">
                {SECTIONS.filter((x) => byStage(x.stage).length > 0).map((x) => (
                  <IncidentsPanel
                    key={x.stage}
                    stage={x.stage}
                    title={x.title}
                    showStage={false}
                    showKitchen={!kitchen}
                    incidents={byStage(x.stage)}
                    linkOrders={session.permissions.has("orders.view")}
                    description={x.description}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
