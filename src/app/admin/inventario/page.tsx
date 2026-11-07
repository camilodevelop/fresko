import Link from "next/link";
import { AlertTriangle, Boxes, PackageX, Wallet } from "lucide-react";
import { UserAvatar } from "@/components/dashboard/UserAvatar";
import { EmptyState, PageHeader, Panel, StatCard, StatusBadge, type StatusTone } from "@/components/dashboard/ui";
import { MinStockForm } from "@/components/inventory/MinStockForm";
import { MovementForm } from "@/components/inventory/MovementForm";
import { loadIngredients } from "@/lib/catalog-admin";
import { loadKitchens } from "@/lib/operations";
import { formatQty, type Unit } from "@/lib/pricing";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { cn, formatPrice } from "@/lib/utils";

const KIND: Record<string, { label: string; tone: StatusTone }> = {
  entrada: { label: "Entrada", tone: "green" },
  perdida: { label: "Pérdida", tone: "red" },
  ajuste: { label: "Ajuste", tone: "blue" },
  consumo: { label: "Consumo", tone: "gray" },
  traslado: { label: "Traslado", tone: "amber" },
};
const short = (name?: string) => (name ?? "").replace(/^Cocina /, "");
/** Fecha ISO de hace `days` días (para el resumen de pérdidas). */
function daysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

const REASON: Record<string, string> = { caducidad: "caducidad", dano: "daño", preparacion: "preparación", otro: "otro" };

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; ingrediente?: string; cocina?: string }>;
}) {
  const session = await requirePermission("inventory.view");
  const canManage = session.permissions.has("inventory.manage");
  const { filtro = "", ingrediente = "", cocina = "" } = await searchParams;
  const supabase = await createClient();

  // Cada cocina tiene su inventario. El superadministrador puede ver además el total de todas.
  const kitchens = (await loadKitchens()).filter((k) => k.active);
  const all = cocina === "todas" && kitchens.length > 1;
  const kitchen = all ? null : (kitchens.find((k) => k.id === cocina) ?? kitchens[0]);
  const scope = all ? kitchens.map((k) => k.id) : kitchen ? [kitchen.id] : [];
  const kitchenName = (id: string | null) => short(kitchens.find((k) => k.id === id)?.name);
  const q = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ ...(kitchens.length > 1 ? { cocina: all ? "todas" : (kitchen?.id ?? "") } : {}), ...extra });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    const t = p.toString();
    return `/admin/inventario${t ? `?${t}` : ""}`;
  };

  let movementsQuery = supabase
    .from("inventory_movements")
    .select("id, kitchen_id, counterpart_kitchen_id, kind, quantity, reason, note, unit_cost, created_at, ingredient_id, ingredients(name, unit), profiles(full_name, email, avatar_url)")
    .in("kitchen_id", scope)
    .order("created_at", { ascending: false })
    .limit(40);
  if (/^[0-9a-f-]{36}$/.test(ingrediente)) movementsQuery = movementsQuery.eq("ingredient_id", ingrediente);

  const [catalog, { data: stockRows }, { data: movements }, { data: losses }] = await Promise.all([
    loadIngredients(),
    supabase.from("kitchen_stock").select("kitchen_id, ingredient_id, stock, min_stock, cost_per_unit").in("kitchen_id", scope),
    movementsQuery,
    supabase
      .from("inventory_movements")
      .select("quantity, unit_cost")
      .in("kitchen_id", scope)
      .eq("kind", "perdida")
      .gte("created_at", daysAgo(30)),
  ]);

  // Stock de la cocina (o la suma de todas): mismo ingrediente del catálogo, valores de cada cocina.
  const ingredients = catalog.map((i) => {
    const rows = (stockRows ?? []).filter((r) => r.ingredient_id === i.id);
    const stock = rows.reduce((s, r) => s + Number(r.stock), 0);
    const value = rows.reduce((s, r) => s + Math.max(0, Number(r.stock)) * Number(r.cost_per_unit), 0);
    return {
      ...i,
      stock,
      min_stock: rows.reduce((s, r) => s + Number(r.min_stock), 0),
      cost_per_unit: stock > 0 ? value / stock : Number(rows[0]?.cost_per_unit ?? i.cost_per_unit),
      value,
      byKitchen: rows.map((r) => ({ kitchen: kitchenName(r.kitchen_id), stock: Number(r.stock) })),
    };
  });

  const active = ingredients.filter((i) => i.active);
  const low = active.filter((i) => i.min_stock > 0 && i.stock > 0 && i.stock < i.min_stock);
  const out = active.filter((i) => i.stock <= 0);
  const value = Math.round(active.reduce((s, i) => s + i.value, 0));
  const lossValue = Math.round((losses ?? []).reduce((s, l) => s + Math.abs(Number(l.quantity)) * Number(l.unit_cost ?? 0), 0));

  const shown = filtro === "alertas" ? [...out, ...low] : active;
  const selected = ingredients.find((i) => i.id === ingrediente);

  return (
    <div>
      <PageHeader
        eyebrow="Productos"
        title="Inventario"
        description="Cada cocina lleva su propio inventario: stock, mínimo y costo. Las compras, pérdidas, conteos y traslados quedan en el historial; al terminar una tanda se descuenta lo que usó la cocina."
      />

      {kitchens.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-1 rounded-full bg-white p-1 text-sm font-semibold shadow-sm ring-1 ring-[#1F4D36]/[0.06] sm:inline-flex">
          {kitchens.map((k) => (
            <Link
              key={k.id}
              href={`/admin/inventario?cocina=${k.id}${filtro ? `&filtro=${filtro}` : ""}`}
              className={cn("rounded-full px-4 py-2", kitchen?.id === k.id ? "bg-[#1F4D36] text-white" : "text-[#1B1B1B]/55 hover:text-[#1F4D36]")}
            >
              {short(k.name)}
            </Link>
          ))}
          {session.allKitchens && (
            <Link
              href={`/admin/inventario?cocina=todas${filtro ? `&filtro=${filtro}` : ""}`}
              className={cn("rounded-full px-4 py-2", all ? "bg-[#1F4D36] text-white" : "text-[#1B1B1B]/55 hover:text-[#1F4D36]")}
            >
              Todas
            </Link>
          )}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={Boxes} label="Ingredientes activos" value={active.length} tone="dark" />
        <StatCard icon={AlertTriangle} label="Bajo el mínimo" value={low.length} hint={low.length ? "Revisa las alertas" : "Todo en orden"} tone={low.length ? "default" : "fresh"} />
        <StatCard icon={PackageX} label="Sin stock" value={out.length} />
        <StatCard icon={Wallet} label="Valor del inventario" value={formatPrice(value)} hint={`Pérdidas 30 días: ${formatPrice(lossValue)}`} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Panel
            bodyClassName="p-0"
            title="Stock"
            actions={
              <div className="flex gap-1 rounded-full bg-[#F8F7F2] p-1 text-xs font-semibold">
                <Link href={q({})} className={cn("rounded-full px-3 py-1.5", !filtro ? "bg-white text-[#1F4D36] shadow-sm" : "text-[#1B1B1B]/50")}>
                  Todos
                </Link>
                <Link
                  href={q({ filtro: "alertas" })}
                  className={cn("rounded-full px-3 py-1.5", filtro === "alertas" ? "bg-white text-[#1F4D36] shadow-sm" : "text-[#1B1B1B]/50")}
                >
                  Alertas ({low.length + out.length})
                </Link>
              </div>
            }
          >
            {shown.length === 0 ? (
              <div className="p-6">
                <EmptyState icon={Boxes} title="Sin alertas" description="Ningún ingrediente está bajo el mínimo." />
              </div>
            ) : (
              <ul className="mt-5 divide-y divide-[#1F4D36]/[0.05] border-t border-[#1F4D36]/[0.06]">
                {shown.map((i) => {
                  const ratio = i.min_stock > 0 ? Math.min(1, i.stock / (i.min_stock * 3)) : 1;
                  const state = i.stock <= 0 ? "out" : i.min_stock > 0 && i.stock < i.min_stock ? "low" : "ok";
                  return (
                    <li key={i.id}>
                      <Link href={q({ ingrediente: i.id, filtro })} className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 hover:bg-[#F8F7F2]/60 sm:flex-nowrap sm:px-6", ingrediente === i.id && "bg-[#F4F8F2]")}>
                        <div className="min-w-0 flex-1 sm:w-44 sm:flex-none">
                          <p className="truncate text-sm font-semibold text-[#1F4D36]">{i.name}</p>
                          <p className="truncate text-xs text-[#1B1B1B]/40">
                            {all ? i.byKitchen.map((b) => `${b.kitchen} ${formatQty(b.stock, i.unit)}`).join(" · ") : i.categoryName}
                          </p>
                        </div>
                        <div className="order-last basis-full sm:order-none sm:basis-auto sm:flex-1">
                          <div className="relative h-2 overflow-hidden rounded-full bg-[#F1F4EE]">
                            <div
                              className={cn("h-full rounded-full", state === "out" ? "bg-red-500" : state === "low" ? "bg-amber-400" : "bg-[#8BC34A]")}
                              style={{ width: `${Math.max(2, ratio * 100)}%` }}
                            />
                            {i.min_stock > 0 && <span className="absolute inset-y-0 w-0.5 bg-[#1B1B1B]/25" style={{ left: "33.3%" }} title="Mínimo" />}
                          </div>
                        </div>
                        <div className="text-right sm:w-36">
                          <p className="text-sm font-semibold text-[#1B1B1B]/80">{formatQty(i.stock, i.unit)}</p>
                          <p className="text-xs text-[#1B1B1B]/40">mín. {formatQty(i.min_stock, i.unit)}</p>
                        </div>
                        <div className="text-right sm:w-20">
                          {state === "out" ? (
                            <StatusBadge tone="red">Agotado</StatusBadge>
                          ) : state === "low" ? (
                            <StatusBadge tone="amber">Bajo</StatusBadge>
                          ) : (
                            <StatusBadge tone="green">OK</StatusBadge>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel
            bodyClassName="p-0"
            title={selected ? `Movimientos · ${selected.name}` : "Últimos movimientos"}
            actions={
              selected && (
                <Link href={q({ filtro })} className="text-xs font-semibold text-[#1F4D36]/70 hover:underline">
                  Ver todos
                </Link>
              )
            }
          >
            {movements && movements.length > 0 ? (
              <>
              {/* Móvil: lista compacta */}
              <ul className="mt-5 divide-y divide-[#1F4D36]/[0.05] border-t border-[#1F4D36]/[0.06] md:hidden">
                {movements.map((m) => {
                  const unit = (m.ingredients?.unit ?? "g") as Unit;
                  const qty = Number(m.quantity);
                  const detail = [
                    all && kitchenName(m.kitchen_id),
                    m.kind === "traslado" && `${qty > 0 ? "desde" : "a"} ${kitchenName(m.counterpart_kitchen_id) || "otra cocina"}`,
                    m.reason && REASON[m.reason],
                    m.note,
                  ].filter(Boolean).join(" · ");
                  return (
                    <li key={m.id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-semibold text-[#1F4D36]">{m.ingredients?.name}</p>
                        <p className={cn("shrink-0 text-sm font-semibold", qty > 0 ? "text-[#2E6B1F]" : "text-red-700")}>
                          {qty > 0 ? "+" : "−"}
                          {formatQty(Math.abs(qty), unit)}
                        </p>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#1B1B1B]/50">
                        <StatusBadge tone={KIND[m.kind]?.tone ?? "gray"}>{KIND[m.kind]?.label ?? m.kind}</StatusBadge>
                        <span>
                          {new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" }).format(new Date(m.created_at))}
                        </span>
                        <span>· {m.profiles ? m.profiles.full_name.split(" ")[0] || m.profiles.email : "Sistema"}</span>
                      </div>
                      {detail && <p className="mt-1 truncate text-xs text-[#1B1B1B]/45">{detail}</p>}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-5 hidden overflow-x-auto md:block">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-y border-[#1F4D36]/[0.06] bg-[#F8F7F2]/60 text-[11px] font-bold uppercase tracking-wider text-[#1B1B1B]/40">
                      <th className="px-6 py-3">Fecha</th>
                      <th className="px-3 py-3">Ingrediente</th>
                      <th className="px-3 py-3">Tipo</th>
                      <th className="px-3 py-3 text-right">Cantidad</th>
                      <th className="px-3 py-3">Detalle</th>
                      <th className="px-6 py-3">Quién</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => {
                      const unit = (m.ingredients?.unit ?? "g") as Unit;
                      const qty = Number(m.quantity);
                      return (
                        <tr key={m.id} className="border-b border-[#1F4D36]/[0.05] last:border-0">
                          <td className="whitespace-nowrap px-6 py-3 text-xs text-[#1B1B1B]/55">
                            {new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" }).format(new Date(m.created_at))}
                          </td>
                          <td className="px-3 py-3 font-medium text-[#1F4D36]">{m.ingredients?.name}</td>
                          <td className="px-3 py-3">
                            <StatusBadge tone={KIND[m.kind]?.tone ?? "gray"}>{KIND[m.kind]?.label ?? m.kind}</StatusBadge>
                          </td>
                          <td className={cn("whitespace-nowrap px-3 py-3 text-right font-semibold", qty > 0 ? "text-[#2E6B1F]" : "text-red-700")}>
                            {qty > 0 ? "+" : "−"}
                            {formatQty(Math.abs(qty), unit)}
                          </td>
                          <td className="max-w-[220px] truncate px-3 py-3 text-xs text-[#1B1B1B]/55">
                            {[
                              all && kitchenName(m.kitchen_id),
                              m.kind === "traslado" && `${qty > 0 ? "desde" : "a"} ${kitchenName(m.counterpart_kitchen_id) || "otra cocina"}`,
                              m.reason && REASON[m.reason],
                              m.note,
                            ].filter(Boolean).join(" · ") || "—"}
                          </td>
                          <td className="px-6 py-3">
                            {m.profiles ? (
                              <span className="flex items-center gap-2 text-xs text-[#1B1B1B]/60">
                                <UserAvatar name={m.profiles.full_name} email={m.profiles.email} src={m.profiles.avatar_url} size={24} />
                                {m.profiles.full_name.split(" ")[0] || m.profiles.email}
                              </span>
                            ) : (
                              <span className="text-xs text-[#1B1B1B]/40">Sistema</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            ) : (
              <div className="p-6">
                <EmptyState icon={Boxes} title="Sin movimientos" />
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-6 xl:sticky xl:top-24">
          {!kitchen ? (
            <Panel title="Todas las cocinas">
              <p className="text-sm text-[#1B1B1B]/55">Aquí ves el total de las cocinas. Para registrar movimientos, elige una cocina.</p>
            </Panel>
          ) : canManage ? (
            <>
              <MovementForm
                key={`${kitchen.id}-${ingrediente}`}
                kitchenId={kitchen.id}
                otherKitchens={(session.allKitchens ? kitchens : ((await supabase.rpc("transfer_targets")).data ?? []))
                  .filter((k) => k.id !== kitchen.id)
                  .map((k) => ({ id: k.id, name: short(k.name) }))}
                defaultIngredient={selected?.id}
                ingredients={active.map(({ id, name, unit, stock }) => ({ id, name, unit, stock }))}
              />
              {selected && (
                <MinStockForm key={`min-${kitchen.id}-${selected.id}`} kitchenId={kitchen.id} ingredientId={selected.id} name={selected.name} unit={selected.unit} current={selected.min_stock} />
              )}
            </>
          ) : (
            <Panel title="Solo lectura">
              <p className="text-sm text-[#1B1B1B]/55">Tu rol puede ver el inventario. Para registrar entradas o pérdidas, pide el permiso “Registrar entradas, ajustes y pérdidas”.</p>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
