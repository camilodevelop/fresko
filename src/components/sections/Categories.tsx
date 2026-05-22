"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { PRODUCT_CATEGORIES } from "@/lib/data/products";

export function Categories() {
  return (
    <section className="relative z-10 bg-[#F8F7F2] pt-4 pb-16 sm:pt-6 sm:pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            eyebrow="Elige tu favorito"
            title="Nuestros productos"
            description="Dos formas de comer fresco: ensaladas y bowls."
            align="left"
            className="mx-0"
          />
          <Link
            href="/menu"
            className="shrink-0 rounded-full border-2 border-[#1F4D36] px-6 py-2.5 text-sm font-semibold text-[#1F4D36] transition-colors hover:bg-[#1F4D36] hover:text-white"
          >
            Ver todo el menú
          </Link>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {PRODUCT_CATEGORIES.map((cat, i) => (
            <motion.article
              key={cat.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              whileHover={{ y: -6 }}
              className="group relative overflow-hidden rounded-3xl bg-white p-5 shadow-lg shadow-[#1F4D36]/5 transition-shadow hover:shadow-xl"
            >
              <div className="flex gap-4">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#F8F7F2]">
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="96px"
                  />
                </div>
                <div className="flex flex-1 flex-col">
                  <h3 className="font-display text-xl font-bold text-[#1F4D36]">
                    {cat.name}
                  </h3>
                  <p className="mt-1 flex-1 text-sm text-[#1B1B1B]/60">
                    {cat.description}
                  </p>
                  <Link
                    href={cat.href}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#1F4D36] group-hover:text-[#8BC34A]"
                  >
                    Ver menú
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
              <motion.div
                className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#1F4D36] text-white opacity-0 transition-opacity group-hover:opacity-100"
                whileHover={{ scale: 1.1 }}
              >
                <ArrowRight className="h-4 w-4" />
              </motion.div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
