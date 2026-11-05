import Image from "next/image";
import { FALLBACK_PRODUCT_IMAGE, isCutoutImage } from "@/lib/product-image";
import Link from "next/link";
import { Plus, Salad } from "lucide-react";
import { CategoriesManager } from "@/components/catalog/CategoriesManager";
import { MarginBadge } from "@/components/catalog/MarginBadge";
import { ViewSwitch } from "@/components/dashboard/ViewSwitch";
import { EmptyState, Panel, StatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { loadCategories, loadPricingSettings } from "@/lib/catalog-admin";
import { planExtra, realMargin, suggestedPrice } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { cn, formatPrice } from "@/lib/utils";
import { ProductActiveSwitch, ProductFeaturedToggle } from "./ProductRowControls";

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; vista?: string }>;
}) {
  const { categoria = "", vista } = await searchParams;
  const supabase = await createClient();

  // Vista "Categorías" dentro de Productos
  if (vista === "categorias") {
    const [{ data: cats }, { count: productCount }] = await Promise.all([
      supabase
        .from("product_categories")
        .select("id, slug, name, description, image_url, sort, active, products(count)")
        .order("sort")
        .order("name"),
      supabase.from("products").select("id", { count: "exact", head: true }),
    ]);
    return (
      <>
        <ViewSwitch
          items={[
            { href: "/admin/catalogo", label: "Productos", active: false, count: productCount ?? 0 },
            { href: "/admin/catalogo?vista=categorias", label: "Categorías", active: true, count: cats?.length ?? 0 },
          ]}
        />
        <CategoriesManager
          categories={(cats ?? []).map(({ products, ...c }) => ({
            ...c,
            products: (products as unknown as { count: number }[])?.[0]?.count ?? 0,
          }))}
        />
      </>
    );
  }

  const categories = await loadCategories();
  const current = categories.find((c) => c.slug === categoria);
  let query = supabase
    .from("products")
    .select("id, name, category_id, kind, image_url, price, tag, target_margin, featured, active")
    .order("sort")
    .order("name");
  if (current) query = query.eq("category_id", current.id);

  const [{ data: products }, { data: costs }, settings] = await Promise.all([
    query,
    supabase.from("product_costs").select("product_id, cost"),
    loadPricingSettings(),
  ]);
  const costOf = new Map((costs ?? []).map((c) => [c.product_id, c.cost ?? 0]));
  const categoryOf = new Map(categories.map((c) => [c.id, c]));
  const filters = [{ slug: "", name: "Todos" }, ...categories.map((c) => ({ slug: c.slug, name: c.name }))];

  const { count: totalProducts } = current
    ? await supabase.from("products").select("id", { count: "exact", head: true })
    : { count: products?.length ?? 0 };

  return (
    <>
    <ViewSwitch
      items={[
        { href: "/admin/catalogo", label: "Productos", active: true, count: totalProducts ?? 0 },
        { href: "/admin/catalogo?vista=categorias", label: "Categorías", active: false, count: categories.length },
      ]}
    />
    <Panel
      bodyClassName="p-0"
      title={`${products?.length ?? 0} productos`}
      description={`Margen objetivo ${Math.round(settings.targetMargin * 100)}% · valor base por porción en planes ${formatPrice(settings.planBaseValue)}`}
      actions={
        <div className="flex items-center gap-2">
          <div className="hidden gap-1 rounded-full bg-[#F8F7F2] p-1 sm:flex">
            {filters.map((f) => (
              <Link
                key={f.slug}
                href={f.slug ? `/admin/catalogo?categoria=${f.slug}` : "/admin/catalogo"}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold",
                  (current?.slug ?? "") === f.slug ? "bg-white text-[#1F4D36] shadow-sm" : "text-[#1B1B1B]/50 hover:text-[#1F4D36]"
                )}
              >
                {f.name}
              </Link>
            ))}
          </div>
          <Button size="sm" asChild>
            <Link href="/admin/catalogo/nuevo">
              <Plus className="h-4 w-4" /> Nuevo producto
            </Link>
          </Button>
        </div>
      }
    >
      {products && products.length > 0 ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-y border-[#1F4D36]/[0.06] bg-[#F8F7F2]/60 text-[11px] font-bold uppercase tracking-wider text-[#1B1B1B]/40">
                <th className="px-6 py-3">Producto</th>
                <th className="px-3 py-3 text-right">Costo</th>
                <th className="px-3 py-3 text-right">Sugerido</th>
                <th className="px-3 py-3 text-right">Precio</th>
                <th className="px-3 py-3 text-center">Margen</th>
                <th className="px-3 py-3 text-right" title="Lo que suma por encima del valor base al elegirlo en un plan (antes del descuento)">
                  Extra en planes
                </th>
                <th className="px-3 py-3 text-center">Destacado</th>
                <th className="px-6 py-3 text-center">Visible</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const cost = costOf.get(p.id) ?? 0;
                const target = p.target_margin !== null ? Number(p.target_margin) : settings.targetMargin;
                const isBuilder = p.kind === "builder";
                const suggested = suggestedPrice(cost, target, settings.rounding);
                const category = categoryOf.get(p.category_id);
                const extra = planExtra(p.price, settings.planBaseValue);
                return (
                  <tr key={p.id} className={cn("border-b border-[#1F4D36]/[0.05] last:border-0 hover:bg-[#F8F7F2]/60", !p.active && "opacity-55")}>
                    <td className="px-6 py-3">
                      <Link href={`/admin/catalogo/${p.id}`} className="group flex items-center gap-3">
                        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[#F4F8F2]">
                          <Image src={p.image_url || FALLBACK_PRODUCT_IMAGE} alt="" fill sizes="44px" className={isCutoutImage(p.image_url) ? "object-contain p-1" : "object-cover"} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-[#1F4D36] group-hover:underline">{p.name}</span>
                          <span className="flex items-center gap-1.5 text-xs text-[#1B1B1B]/45">
                            {category?.name ?? "Sin categoría"}
                            {isBuilder && <StatusBadge tone="blue" dot={false} className="py-0.5">Armador</StatusBadge>}
                            {p.tag && <StatusBadge tone="gray" dot={false} className="py-0.5">{p.tag}</StatusBadge>}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-right text-[#1B1B1B]/65">{isBuilder ? "—" : formatPrice(cost)}</td>
                    <td className="px-3 py-3 text-right text-[#1B1B1B]/45">{isBuilder || !cost ? "—" : formatPrice(suggested)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-[#1F4D36]">{formatPrice(p.price)}</td>
                    <td className="px-3 py-3 text-center">
                      {isBuilder || !cost ? <span className="text-[#1B1B1B]/30">—</span> : <MarginBadge margin={realMargin(p.price, cost)} target={target} />}
                    </td>
                    <td className="px-3 py-3 text-right text-xs">
                      <span className={extra ? "font-semibold text-amber-700" : "text-[#1B1B1B]/40"}>
                        {extra ? `+${formatPrice(extra)}` : "Sin extra"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <ProductFeaturedToggle id={p.id} featured={p.featured} />
                    </td>
                    <td className="px-6 py-3 text-center">
                      <ProductActiveSwitch id={p.id} active={p.active} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-6">
          <EmptyState
            icon={Salad}
            title="Sin productos"
            description="Crea el primero y arma su receta."
            action={
              <Button size="sm" asChild>
                <Link href="/admin/catalogo/nuevo">Nuevo producto</Link>
              </Button>
            }
          />
        </div>
      )}
    </Panel>
    </>
  );
}
