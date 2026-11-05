import Link from "next/link";
import {
  ArrowUpRight,
  Boxes,
  ChefHat,
  MapPin,
  Salad,
  Shield,
  SlidersHorizontal,
  Truck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { PageHeader, StatCard, StatusBadge } from "@/components/dashboard/ui";
import type { NavIcon } from "@/components/dashboard/types";
import { adminNavFor } from "@/lib/data/admin-nav";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const ICONS: Partial<Record<NavIcon, LucideIcon>> = {
  chef: ChefHat,
  truck: Truck,
  salad: Salad,
  boxes: Boxes,
  map: MapPin,
  users: Users,
  shield: Shield,
  sliders: SlidersHorizontal,
};

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("es-CO", { hour: "numeric", hourCycle: "h23", timeZone: "America/Bogota" }).format(new Date())
  );
  return hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
}

export default async function AdminHomePage() {
  const session = await requirePermission("admin.access");
  const supabase = await createClient();
  const can = (p: string) => session.permissions.has(p);

  const [users, clients, zones, cities, ingredients] = await Promise.all([
    can("users.manage") ? supabase.from("profiles").select("id", { count: "exact", head: true }) : null,
    can("users.manage")
      ? supabase.from("user_roles").select("user_id, roles!inner(key)", { count: "exact", head: true }).eq("roles.key", "cliente")
      : null,
    can("zones.manage") ? supabase.from("zones").select("id", { count: "exact", head: true }).eq("active", true) : null,
    can("zones.manage") ? supabase.from("cities").select("id", { count: "exact", head: true }).eq("active", true) : null,
    can("inventory.view") ? supabase.from("ingredients").select("stock, min_stock").eq("active", true) : null,
  ]);
  const lowStock = ingredients?.data?.filter((i) => Number(i.min_stock) > 0 && Number(i.stock) < Number(i.min_stock)).length;


  const groups = adminNavFor(session.permissions).filter((g) => g.label !== "General" && g.label !== "Cuenta");

  return (
    <div>
      <PageHeader
        eyebrow="Resumen"
        title={`${greeting()}, ${session.fullName.split(" ")[0] || "equipo"}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Tu rol:
            {session.roleNames.map((r) => (
              <StatusBadge key={r} tone="dark" dot={false}>
                {r}
              </StatusBadge>
            ))}
          </span>
        }
      />

      {(users || zones || ingredients) && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {users && (
            <StatCard icon={UserRound} label="Usuarios registrados" value={users.count ?? 0} hint="Clientes y personal" tone="dark" />
          )}
          {clients && (
            <StatCard
              icon={Users}
              label="Clientes"
              value={clients.count ?? 0}
              hint={`${(users?.count ?? 0) - (clients.count ?? 0)} del equipo`}
            />
          )}
          {zones && <StatCard icon={MapPin} label="Zonas activas" value={zones.count ?? 0} hint="Con cobertura hoy" tone="fresh" />}
          {cities && <StatCard icon={MapPin} label="Ciudades activas" value={cities.count ?? 0} />}
          {ingredients && (
            <Link href="/admin/inventario?filtro=alertas" className="block">
              <StatCard
                icon={Boxes}
                label="Ingredientes bajo el mínimo"
                value={lowStock ?? 0}
                hint={lowStock ? "Ver alertas de inventario" : "Inventario en orden"}
                tone={lowStock ? "default" : "fresh"}
              />
            </Link>
          )}
        </div>
      )}

      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.label}>
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1B1B1B]/40">{group.label}</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon] ?? Salad;
                const body = (
                  <>
                    <div className="flex items-start justify-between">
                      <span
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-2xl",
                          item.soon ? "bg-[#1B1B1B]/[0.04] text-[#1B1B1B]/35" : "bg-[#F4F8F2] text-[#1F4D36]"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      {item.soon ? (
                        <StatusBadge tone="gray" dot={false}>Próxima fase</StatusBadge>
                      ) : (
                        <ArrowUpRight className="h-5 w-5 text-[#1F4D36]/30 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#1F4D36]" />
                      )}
                    </div>
                    <h3 className={cn("mt-5 font-display text-lg font-bold", item.soon ? "text-[#1B1B1B]/45" : "text-[#1F4D36]")}>
                      {item.label}
                    </h3>
                    <p className="mt-1 text-sm text-[#1B1B1B]/50">{item.description}</p>
                  </>
                );
                const className = cn(
                  "group rounded-3xl border p-5",
                  item.soon
                    ? "border-dashed border-[#1F4D36]/12 bg-white/50"
                    : "border-[#1F4D36]/[0.07] bg-white shadow-[0_1px_2px_rgba(31,77,54,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#1F4D36]/5"
                );
                return item.soon ? (
                  <div key={item.href} className={className}>{body}</div>
                ) : (
                  <Link key={item.href} href={item.href} className={className}>{body}</Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
