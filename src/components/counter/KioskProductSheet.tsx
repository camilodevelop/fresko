"use client";

import Image from "next/image";
import { useState } from "react";
import { Leaf, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { AllergenList, NutritionFacts } from "@/components/menu/NutritionFacts";
import { dietaryLabel } from "@/lib/nutrition";
import { isCutoutImage } from "@/lib/product-image";
import { cn, formatPrice } from "@/lib/utils";
import type { CounterProduct } from "@/lib/counter";

/** Detalle de un plato en el autoservicio: foto grande, qué lleva, nutrición, alérgenos y cantidad. */
export function KioskProductSheet({ product, onAdd, onClose }: { product: CounterProduct; onAdd: (quantity: number) => void; onClose: () => void }) {
  const [qty, setQty] = useState(1);
  return (
    <Sheet
      title={product.name}
      description={product.categoryName}
      onClose={onClose}
      className="md:w-[min(920px,calc(100%-3rem))]"
      footer={
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Quitar uno"
              disabled={qty <= 1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F4F8F2] text-[#1F4D36] disabled:opacity-40"
            >
              <Minus className="h-6 w-6" />
            </button>
            <span className="w-8 text-center font-display text-2xl font-bold text-[#1F4D36]">{qty}</span>
            <button
              type="button"
              aria-label="Agregar uno"
              disabled={qty >= 20}
              onClick={() => setQty((q) => Math.min(20, q + 1))}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F4F8F2] text-[#1F4D36] disabled:opacity-40"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
          <Button size="lg" className="h-14 flex-1 text-lg sm:flex-none sm:px-10" onClick={() => onAdd(qty)}>
            Agregar · {formatPrice(product.price * qty)}
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="relative aspect-square overflow-hidden rounded-3xl bg-[radial-gradient(ellipse_80%_70%_at_50%_42%,#FFFFFF_0%,#F6F9F3_60%,#EAF2E3_100%)]">
          <Image src={product.image} alt={product.name} fill sizes="(max-width: 768px) 90vw, 420px" className={cn(isCutoutImage(product.image) ? "object-contain p-8" : "object-cover")} />
          {product.tag && <span className="absolute left-4 top-4 rounded-full bg-[#8BC34A] px-3 py-1 text-sm font-bold text-[#1F4D36]">{product.tag}</span>}
        </div>
        <div>
          <p className="font-display text-3xl font-bold text-[#1F4D36]">{formatPrice(product.price)}</p>
          {product.description && <p className="mt-3 text-lg leading-relaxed text-[#1B1B1B]/70">{product.description}</p>}
          {product.dietaryTags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {product.dietaryTags.map((t) => (
                <li key={t} className="inline-flex items-center gap-1 rounded-full bg-[#EEF5E6] px-3 py-1.5 text-sm font-semibold text-[#1F4D36]">
                  <Leaf className="h-3.5 w-3.5 text-[#6FA233]" />
                  {dietaryLabel(t)}
                </li>
              ))}
            </ul>
          )}
          <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/45">Información nutricional</h3>
          {product.nutrition ? (
            <NutritionFacts nutrition={product.nutrition} className="mt-3" />
          ) : (
            <p className="mt-2 text-sm text-[#1B1B1B]/50">Pronto publicaremos la información nutricional de este plato.</p>
          )}
          <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/45">Alérgenos</h3>
          <div className="mt-3">
            <AllergenList allergens={product.allergens} />
          </div>
        </div>
      </div>
    </Sheet>
  );
}
