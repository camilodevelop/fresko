"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Leaf, Sparkles, X } from "lucide-react";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { Button } from "@/components/ui/button";
import type { MenuItem } from "@/lib/data/products";
import { dietaryLabel } from "@/lib/nutrition";
import { cn, formatPrice } from "@/lib/utils";
import { isCutoutImage } from "@/lib/product-image";
import { AllergenList, NutritionFacts } from "./NutritionFacts";

/** Detalle del producto: imagen grande, descripción, nutrición y alérgenos. */
export function ProductDetailModal({
  item,
  onClose,
  action,
}: {
  item: MenuItem;
  onClose: () => void;
  /** Reemplaza el botón de agregar al carrito (p. ej. en la página de un punto de venta). */
  action?: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    // No se llama dialog.close() aquí: el evento "close" volvería a cerrar la ficha
    // (en desarrollo React monta los efectos dos veces). Al desmontarse, el diálogo desaparece.
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Clic en el fondo (fuera del contenido) cierra.
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby={`product-${item.id}-title`}
      className="mb-0 mt-auto max-h-[94dvh] w-full max-w-full overflow-hidden rounded-t-[1.75rem] bg-white p-0 text-left shadow-2xl shadow-[#1F4D36]/25 backdrop:bg-[#10291D]/55 backdrop:backdrop-blur-sm md:m-auto md:max-h-[92dvh] md:w-[min(960px,calc(100%-3rem))] md:rounded-[2rem]"
    >
      <div className="grid max-h-[94dvh] overflow-y-auto overscroll-contain md:max-h-[92dvh] md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:overflow-hidden">
        <div className="relative aspect-[4/3] bg-[radial-gradient(ellipse_80%_70%_at_50%_42%,#FFFFFF_0%,#F6F9F3_60%,#EAF2E3_100%)] sm:aspect-[16/10] md:aspect-auto md:min-h-[560px]">
          <span className="absolute left-1/2 top-2 z-10 h-1.5 w-10 -translate-x-1/2 rounded-full bg-white/80 shadow-sm md:hidden" aria-hidden />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#1F4D36] shadow-md backdrop-blur md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
          <Image src={item.image} alt={item.name} fill sizes="(max-width: 768px) 100vw, 480px" className={cn(isCutoutImage(item.image) ? "object-contain p-8 sm:p-12" : "object-cover")} priority />
          {item.tag && (
            <span className="absolute left-4 top-4 rounded-full bg-[#8BC34A] px-3 py-1 text-xs font-bold text-[#1F4D36] md:left-5 md:top-5">{item.tag}</span>
          )}
        </div>

        <div className="flex flex-col md:max-h-[92dvh] md:overflow-y-auto">
          <div className="flex-1 p-5 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#8BC34A]">{item.categoryName}</p>
                <h2 id={`product-${item.id}-title`} className="mt-1 font-display text-2xl font-bold text-[#1F4D36] sm:text-3xl">
                  {item.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="-mr-2 -mt-1 hidden rounded-full p-2 text-[#1B1B1B]/40 transition-colors hover:bg-[#F4F8F2] hover:text-[#1F4D36] md:block"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-3 text-[15px] leading-relaxed text-[#1B1B1B]/65">{item.ingredients}</p>

            {item.dietaryTags.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {item.dietaryTags.map((t) => (
                  <li key={t} className="inline-flex items-center gap-1 rounded-full bg-[#EEF5E6] px-3 py-1 text-xs font-semibold text-[#1F4D36]">
                    <Leaf className="h-3 w-3 text-[#6FA233]" />
                    {dietaryLabel(t)}
                  </li>
                ))}
              </ul>
            )}

            <h3 className="mt-7 text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/45">Información nutricional</h3>
            {item.nutrition ? (
              <NutritionFacts nutrition={item.nutrition} className="mt-3" />
            ) : item.builder ? (
              <p className="mt-3 flex items-start gap-3 rounded-3xl border border-[#1F4D36]/10 bg-[#F8FAF5] p-5 text-sm text-[#1B1B1B]/60">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#8BC34A]" />
                Las calorías y los macros se calculan en vivo según los ingredientes que elijas en el armador.
              </p>
            ) : (
              <p className="mt-3 text-sm text-[#1B1B1B]/50">Pronto publicaremos la información nutricional de este producto.</p>
            )}

            {!item.builder && (
              <>
                <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/45">Alérgenos</h3>
                <div className="mt-3">
                  <AllergenList allergens={item.allergens} />
                </div>
              </>
            )}
          </div>

          <div className="sticky bottom-0 flex items-center justify-between gap-4 border-t border-[#1F4D36]/[0.07] bg-white/95 px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-8 sm:py-4">
            <div>
              <p className="text-[11px] text-[#1B1B1B]/45">{item.builder ? "Desde" : "Precio"}</p>
              <p className="font-display text-2xl font-bold text-[#1F4D36]">{formatPrice(item.price)}</p>
            </div>
            {action ? (
              action
            ) : item.builder ? (
              <Button asChild>
                <Link href={`/arma-tu-bowl?producto=${item.id}`}>Armar el mío</Link>
              </Button>
            ) : (
              <AddToCartButton item={item} />
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
