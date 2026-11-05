import { PageHeader } from "@/components/dashboard/ui";
import { ZoneEditor } from "@/components/admin/ZoneEditor";
import { requirePermission } from "@/lib/supabase/auth";
import { loadZoneContext } from "../loadZoneContext";

export default async function NuevaZonaPage({
  searchParams,
}: {
  searchParams: Promise<{ ciudad?: string }>;
}) {
  await requirePermission("zones.manage");
  const { ciudad } = await searchParams;
  const { cities, others } = await loadZoneContext();

  return (
    <div>
      <PageHeader
        back={{ href: "/admin/zonas", label: "Cobertura" }}
        eyebrow="Zona de cobertura"
        title={"Nueva zona"}
        description="Dibuja el área en el mapa y define cuándo se entrega."
      />
      <ZoneEditor
        cities={cities}
        others={others}
        initial={{
          cityId: ciudad ?? cities[0]?.id ?? "",
          name: "",
          color: "#8BC34A",
          cutoffTime: "08:00",
          deliveryDays: [1, 2, 3, 4, 5, 6],
          active: true,
          polygon: [],
          slots: [
            { start: "11:00", end: "13:00" },
            { start: "13:00", end: "15:00" },
          ],
        }}
      />
    </div>
  );
}
