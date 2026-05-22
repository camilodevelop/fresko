"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { TESTIMONIALS } from "@/lib/data/testimonials";

export function Testimonials() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Clientes felices"
          title="Lo que dicen de nosotros"
          description="Miles de bogotanos ya disfrutan FRESKO cada día."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <motion.blockquote
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col rounded-3xl bg-white p-6 shadow-lg shadow-[#1F4D36]/5 sm:p-8"
            >
              <div className="flex gap-1">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star
                    key={j}
                    className="h-4 w-4 fill-[#8BC34A] text-[#8BC34A]"
                  />
                ))}
              </div>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-[#1B1B1B]/70">
                &ldquo;{t.comment}&rdquo;
              </p>
              <footer className="mt-6 flex items-center gap-3 border-t border-[#1F4D36]/8 pt-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#C5E1A5] font-display text-sm font-bold text-[#1F4D36]">
                  {t.avatar}
                </div>
                <div>
                  <cite className="not-italic font-display font-semibold text-[#1F4D36]">
                    {t.name}
                  </cite>
                  <p className="text-xs text-[#1B1B1B]/50">{t.role}</p>
                </div>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
