"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MenuItem } from "@/lib/data/products";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { formatGrams } from "@/lib/nutrition";
import { isCutoutImage } from "@/lib/product-image";
import { cn, formatPrice } from "@/lib/utils";
import { ProductDetailModal } from "./ProductDetailModal";

type MenuProductCardProps = {
  item: MenuItem;
  index?: number;
  /** scroll = home; list = menú; none = carrusel */
  animation?: "scroll" | "list" | "none";
};

const cardClassName =
  "group flex h-full flex-col overflow-hidden rounded-3xl border border-[#1F4D36]/10 bg-white shadow-lg shadow-[#1F4D36]/8 transition-shadow hover:shadow-xl";

function CardContent({ item }: { item: MenuItem }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ver detalle de ${item.name}`}
        className="relative block aspect-square w-full cursor-zoom-in overflow-hidden border-b border-[#E8EFE4] bg-[#FCFDFB] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_75%_at_50%_40%,#FFFFFF_0%,#F9FBF7_65%,#F4F8F2_100%)]"
          aria-hidden
        />
        <Image
          src={item.image}
          alt={item.name}
          fill
          className={cn(
            "relative z-10 transition-transform duration-500 group-hover:scale-105",
            isCutoutImage(item.image) ? "object-contain p-6" : "object-cover"
          )}
          sizes="(max-width: 640px) 85vw, (max-width: 1024px) 45vw, 25vw"
          loading="lazy"
        />
        {item.tag && (
          <span className="absolute left-4 top-4 z-20 rounded-full bg-[#8BC34A] px-3 py-1 text-xs font-bold text-[#1F4D36]">
            {item.tag}
          </span>
        )}
        {item.nutrition && (
          <span className="absolute bottom-3 left-3 z-20 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#1F4D36] shadow-sm backdrop-blur">
            <Flame className="h-3 w-3 text-[#E8833A]" />
            {Math.round(item.nutrition.kcal)} kcal · {formatGrams(item.nutrition.protein)} prot.
          </span>
        )}
      </button>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8BC34A]">
          {item.categoryName}
        </p>
        <h2 className="mt-1 font-display text-xl font-bold text-[#1F4D36]">
          <button type="button" onClick={() => setOpen(true)} className="text-left hover:underline hover:decoration-[#8BC34A] hover:decoration-2 hover:underline-offset-4">
            {item.name}
          </button>
        </h2>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-[#1B1B1B]/60">
          {item.ingredients}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="font-display text-2xl font-bold text-[#1F4D36]">
            {formatPrice(item.price)}
          </span>
          {item.builder ? (
            <Button size="sm" variant="secondary" asChild>
              <Link href={`/arma-tu-bowl?producto=${item.id}`}>Armar</Link>
            </Button>
          ) : (
            <AddToCartButton item={item} />
          )}
        </div>
      </div>
      {open && <ProductDetailModal item={item} onClose={() => setOpen(false)} />}
    </>
  );
}

export function MenuProductCard({
  item,
  index = 0,
  animation = "scroll",
}: MenuProductCardProps) {
  if (animation === "none") {
    return (
      <article className={cardClassName}>
        <CardContent item={item} />
      </article>
    );
  }

  const motionProps =
    animation === "list"
      ? {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { delay: index * 0.05 },
        }
      : {
          initial: { opacity: 0, y: 16 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true },
          transition: { delay: index * 0.05 },
        };

  return (
    <motion.article {...motionProps} className={cardClassName}>
      <CardContent item={item} />
    </motion.article>
  );
}
