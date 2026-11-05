import { AddressesManager } from "@/components/address/AddressesManager";
import { PageHeader } from "@/components/dashboard/ui";
import { getActiveZones } from "@/lib/data/zones";
import { loadMyAddresses } from "@/lib/orders";
import { requireSession } from "@/lib/supabase/auth";

export default async function DireccionesPage() {
  const session = await requireSession("/cuenta/direcciones");
  const [addresses, zones] = await Promise.all([loadMyAddresses(session.userId), getActiveZones()]);
  return (
    <div>
      <PageHeader
        eyebrow="Entregas"
        title="Mis direcciones"
        description="Dónde recibes tus pedidos. La principal se elige sola al pagar."
      />
      <AddressesManager addresses={addresses} zones={zones} />
    </div>
  );
}
