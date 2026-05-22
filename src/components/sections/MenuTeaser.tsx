"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductsCarousel } from "@/components/sections/ProductsCarousel";
import { SectionHeading } from "@/components/ui/section-heading";
import { MOST_ORDERED_PRODUCTS } from "@/lib/data/products";

export function MenuTeaser() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            eyebrow="Menú"
            title="Productos más pedidos"
            description="Los favoritos de nuestros clientes. Desliza o usa las flechas para ver más."
            align="left"
            className="mx-0"
          />
          <Button variant="secondary" asChild className="shrink-0">
            <Link href="/menu">
              Ver menú completo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <ProductsCarousel items={MOST_ORDERED_PRODUCTS} />
      </div>
    </section>
  );
}
