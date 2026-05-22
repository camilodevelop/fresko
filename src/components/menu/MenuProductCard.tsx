"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, type MenuItem } from "@/lib/data/products";
import { formatPrice } from "@/lib/utils";
import { WHATSAPP_URL } from "@/lib/constants";

type MenuProductCardProps = {
  item: MenuItem;
  index?: number;
  /** scroll = home; list = menú; none = carrusel */
  animation?: "scroll" | "list" | "none";
};

const cardClassName =
  "group flex h-full flex-col overflow-hidden rounded-3xl border border-[#1F4D36]/10 bg-white shadow-lg shadow-[#1F4D36]/8 transition-shadow hover:shadow-xl";

function CardContent({ item }: { item: MenuItem }) {
  return (
    <>
      <div className="relative aspect-square overflow-hidden border-b border-[#E8EFE4] bg-[#FCFDFB] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_75%_at_50%_40%,#FFFFFF_0%,#F9FBF7_65%,#F4F8F2_100%)]"
          aria-hidden
        />
        <Image
          src={item.image}
          alt={item.name}
          fill
          className="relative z-10 object-contain p-6 transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 85vw, (max-width: 1024px) 45vw, 25vw"
          loading="lazy"
        />
        {item.tag && (
          <span className="absolute left-4 top-4 rounded-full bg-[#8BC34A] px-3 py-1 text-xs font-bold text-[#1F4D36]">
            {item.tag}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8BC34A]">
          {CATEGORY_LABELS[item.category]}
        </p>
        <h2 className="mt-1 font-display text-xl font-bold text-[#1F4D36]">
          {item.name}
        </h2>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-[#1B1B1B]/60">
          {item.ingredients}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="font-display text-2xl font-bold text-[#1F4D36]">
            {formatPrice(item.price)}
          </span>
          {item.id === "custom" ? (
            <Button size="sm" variant="secondary" asChild>
              <Link href="/arma-tu-bowl">Armar</Link>
            </Button>
          ) : (
            <Button size="sm" variant="secondary" asChild>
              <a
                href={`${WHATSAPP_URL}&text=${encodeURIComponent(`Quiero pedir: ${item.name}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Plus className="h-4 w-4" />
                Agregar
              </a>
            </Button>
          )}
        </div>
      </div>
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
