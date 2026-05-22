"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MenuProductCard } from "@/components/menu/MenuProductCard";
import type { MenuItem } from "@/lib/data/products";
import { cn } from "@/lib/utils";

type ProductsCarouselProps = {
  items: MenuItem[];
};

export function ProductsCarousel({ items }: ProductsCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 8);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8);

    const slides = Array.from(el.children) as HTMLElement[];
    if (slides.length === 0) return;

    const center = scrollLeft + clientWidth / 2;
    let closest = 0;
    let minDist = Infinity;
    slides.forEach((slide, i) => {
      const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
      const dist = Math.abs(center - slideCenter);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    setActiveIndex(closest);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, items.length]);

  const scroll = (direction: "left" | "right") => {
    const el = trackRef.current;
    if (!el) return;

    const firstSlide = el.children[0] as HTMLElement | undefined;
    const gap = 24;
    const step = firstSlide ? firstSlide.offsetWidth + gap : el.clientWidth * 0.85;

    el.scrollBy({
      left: direction === "left" ? -step : step,
      behavior: "smooth",
    });
  };

  const scrollToIndex = (index: number) => {
    const el = trackRef.current;
    const slide = el?.children[index] as HTMLElement | undefined;
    if (!el || !slide) return;

    el.scrollTo({
      left: slide.offsetLeft - (el.clientWidth - slide.offsetWidth) / 2,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative mt-10">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden w-16 bg-gradient-to-r from-[#F8F7F2] to-transparent sm:block" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-16 bg-gradient-to-l from-[#F8F7F2] to-transparent sm:block" />

      <button
        type="button"
        onClick={() => scroll("left")}
        disabled={!canScrollLeft}
        className={cn(
          "absolute -left-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#1F4D36]/10 bg-white text-[#1F4D36] shadow-lg transition-all hover:bg-[#1F4D36] hover:text-white disabled:pointer-events-none disabled:opacity-0 sm:flex lg:-left-5",
          !canScrollLeft && "sm:opacity-0"
        )}
        aria-label="Producto anterior"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={() => scroll("right")}
        disabled={!canScrollRight}
        className={cn(
          "absolute -right-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#1F4D36]/10 bg-white text-[#1F4D36] shadow-lg transition-all hover:bg-[#1F4D36] hover:text-white disabled:pointer-events-none disabled:opacity-0 sm:flex lg:-right-5",
          !canScrollRight && "sm:opacity-0"
        )}
        aria-label="Siguiente producto"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="region"
        aria-roledescription="carrusel"
        aria-label="Productos más pedidos"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="w-[min(100%,300px)] shrink-0 snap-center sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-3rem)/3)] xl:w-[calc((100%-4.5rem)/4)]"
          >
            <MenuProductCard item={item} animation="none" />
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-center gap-2">
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => scrollToIndex(i)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              activeIndex === i
                ? "w-6 bg-[#1F4D36]"
                : "w-2 bg-[#1F4D36]/25 hover:bg-[#1F4D36]/40"
            )}
            aria-label={`Ir a ${item.name}`}
            aria-current={activeIndex === i ? "true" : undefined}
          />
        ))}
      </div>
    </div>
  );
}
