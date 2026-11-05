"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Search } from "lucide-react";
import { Panel, StatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import type { IngredientRow } from "@/lib/catalog-admin";
import { displayUnit, formatQty, unitFactor, type IngredientCategory } from "@/lib/pricing";
import { cn, formatPrice } from "@/lib/utils";

function stockStatus(i: IngredientRow) {
  if (i.stock <= 0) return { tone: "red" as const, label: "Sin stock" };
  if (i.min_stock > 0 && i.stock < i.min_stock) return { tone: "amber" as const, label: "Bajo" };
  return { tone: "green" as const, label: "OK" };
}

/** Lista de ingredientes; cada fila abre su página de edición (igual que productos). */
export function IngredientsManager({
  ingredients,
  usage,
  categories,
}: {
  ingredients: IngredientRow[];
  usage: Record<string, number>;
  categories: IngredientCategory[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");

  const list = useMemo(
    () => ingredients.filter((i) => (!cat || i.category === cat) && (!q || i.name.toLowerCase().includes(q.toLowerCase()))),
    [ingredients, q, cat]
  );

  return (
    <Panel
      bodyClassName="p-0"
      title={`${list.length} ingredientes`}
      description="Costo por kilo, litro o unidad. Las recetas usan gramos, mililitros o unidades."
      actions={
        <Button size="sm" asChild>
          <Link href="/admin/catalogo/ingredientes/nuevo">
            <Plus className="h-4 w-4" /> Nuevo ingrediente
          </Link>
        </Button>
      }
    >
      <div className="mt-4 flex flex-wrap items-center gap-2 px-6">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1B1B1B]/35" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar ingrediente"
            aria-label="Buscar ingrediente"
            className="h-9 w-full rounded-full border border-[#1F4D36]/12 bg-[#F8F7F2] pl-9 pr-3 text-sm outline-none focus:border-[#8BC34A] focus:bg-white"
          />
        </div>
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          aria-label="Filtrar por categoría"
          className="h-9 rounded-full border border-[#1F4D36]/12 bg-[#F8F7F2] px-3 text-sm"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <table className="mt-4 w-full table-fixed text-left text-sm">
        <thead>
          <tr className="border-y border-[#1F4D36]/[0.06] bg-[#F8F7F2]/60 text-[11px] font-bold uppercase tracking-wider text-[#1B1B1B]/40">
            <th className="py-3 pl-6 pr-3">Ingrediente</th>
            <th className="hidden w-[16%] px-3 py-3 text-right sm:table-cell">Costo</th>
            <th className="hidden w-[20%] px-3 py-3 text-right lg:table-cell">Nutrición</th>
            <th className="w-[38%] px-3 py-3 text-right sm:w-[24%]">Stock</th>
            <th className="hidden w-[9%] px-3 py-3 text-center md:table-cell">Recetas</th>
            <th className="w-10 py-3 pr-4" aria-label="Abrir" />
          </tr>
        </thead>
        <tbody>
          {list.map((i) => {
            const status = stockStatus(i);
            const hasNutrition = i.nutrition.kcal > 0 || i.nutrition.protein > 0;
            const href = `/admin/catalogo/ingredientes/${i.id}`;
            const cost = `${formatPrice(Math.round(i.cost_per_unit * unitFactor(i.unit)))}`;
            return (
              <tr
                key={i.id}
                onClick={() => router.push(href)}
                className={cn("cursor-pointer border-b border-[#1F4D36]/[0.05] last:border-0 hover:bg-[#F8F7F2]/70", !i.active && "opacity-50")}
              >
                <td className="py-3 pl-6 pr-3">
                  <Link href={href} className="flex min-w-0 items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-[#F4F8F2]">
                      {i.image_url ? (
                        <Image src={i.image_url} alt="" fill sizes="40px" className="object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-[#1B1B1B]/30">
                          {i.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-[#1F4D36]">{i.name}</span>
                      <span className="block truncate text-xs text-[#1B1B1B]/45">
                        {i.categoryName}
                        <span className="sm:hidden">
                          {" "}
                          · {cost}/{displayUnit(i.unit)}
                        </span>
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="hidden px-3 py-3 text-right text-[#1B1B1B]/70 sm:table-cell">
                  {cost}
                  <span className="text-xs text-[#1B1B1B]/40"> /{displayUnit(i.unit)}</span>
                </td>
                <td className="hidden px-3 py-3 text-right lg:table-cell">
                  {hasNutrition ? (
                    <>
                      <span className="font-medium text-[#1B1B1B]/70">{Math.round(i.nutrition.kcal)} kcal</span>
                      <span className="block truncate text-[11px] text-[#1B1B1B]/40">
                        P {i.nutrition.protein} · C {i.nutrition.carbs} · G {i.nutrition.fat}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-amber-700">Sin datos</span>
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  <span className="inline-flex items-center justify-end gap-2">
                    <span className="font-medium text-[#1B1B1B]/75">{formatQty(i.stock, i.unit)}</span>
                    <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                  </span>
                  <span className="block text-[11px] text-[#1B1B1B]/40">mín. {formatQty(i.min_stock, i.unit)}</span>
                </td>
                <td className="hidden px-3 py-3 text-center text-[#1B1B1B]/55 md:table-cell">{usage[i.id] ?? 0}</td>
                <td className="py-3 pr-4 text-right text-[#1F4D36]/35">
                  <ChevronRight className="ml-auto h-4 w-4" />
                </td>
              </tr>
            );
          })}
          {list.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-10 text-center text-sm text-[#1B1B1B]/45">
                No hay ingredientes con ese filtro.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Panel>
  );
}
