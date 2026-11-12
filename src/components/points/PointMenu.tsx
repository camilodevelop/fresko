"use client";

import Image from "next/image";
import { useState } from "react";
import { Flame, Store } from "lucide-react";
import { ProductDetailModal } from "@/components/menu/ProductDetailModal";
import type { MenuItem } from "@/lib/data/products";
import { formatGrams } from "@/lib/nutrition";
import { isCutoutImage } from "@/lib/product-image";
import { cn, formatPrice } from "@/lib/utils";

export type PointMenuItem = MenuItem & { available: number };

/** Disponibilidad para el cliente (sin mostrar cantidades exactas grandes). */
function availability(n: number) {
  if (n <= 3) return { label: n === 1 ? "¡Queda 1!" : `¡Quedan ${n}!`, tone: "bg-amber-100 text-amber-900" };
  return { label: "Disponible", tone: "bg-[#E8F3DC] text-[#2E6B1F]" };
}

/** Platos disponibles ahora en el punto; al tocar, el detalle completo. */
export function PointMenu({ items }: { items: PointMenuItem[] }) {
  const [open, setOpen] = useState<PointMenuItem | null>(null);
  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        {items.map((item) => {
          const a = availability(item.available);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setOpen(item)}
              className="group flex flex-col overflow-hidden rounded-3xl border border-[#1F4D36]/10 bg-white text-left shadow-lg shadow-[#1F4D36]/8 transition hover:shadow-xl"
            >
              <span className="relative block aspect-square overflow-hidden bg-[#FCFDFB]">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="(max-width: 1024px) 50vw, 25vw"
                  className={cn("transition-transform duration-500 group-hover:scale-105", isCutoutImage(item.image) ? "object-contain p-5" : "object-cover")}
                />
                <span className={cn("absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold", a.tone)}>{a.label}</span>
                {item.nutrition && (
                  <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#1F4D36] shadow-sm">
                    <Flame className="h-3 w-3 text-[#E8833A]" />
                    {Math.round(item.nutrition.kcal)} kcal · {formatGrams(item.nutrition.protein)} prot.
                  </span>
                )}
              </span>
              <span className="flex flex-1 flex-col p-4 sm:p-5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8BC34A]">{item.categoryName}</span>
                <span className="mt-1 font-display text-lg font-bold leading-tight text-[#1F4D36]">{item.name}</span>
                <span className="mt-1 line-clamp-2 flex-1 text-xs leading-relaxed text-[#1B1B1B]/55 sm:text-sm">{item.ingredients}</span>
                <span className="mt-3 flex items-center justify-between gap-2">
                  <span className="font-display text-xl font-bold text-[#1F4D36]">{formatPrice(item.price)}</span>
                  <span className="text-xs font-semibold text-[#7CB342]">Ver detalle</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {open && (
        <ProductDetailModal
          item={open}
          onClose={() => setOpen(null)}
          action={
            <span className="flex max-w-[60%] items-center gap-2 rounded-2xl bg-[#F4F8F2] px-4 py-2.5 text-sm font-semibold text-[#1F4D36]">
              <Store className="h-4 w-4 shrink-0" />
              Pídelo al vendedor del punto
            </span>
          }
        />
      )}
    </>
  );
}
