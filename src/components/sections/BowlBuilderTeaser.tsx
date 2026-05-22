"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BowlBuilderTeaser() {
  return (
    <section className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#1F4D36] to-[#163a29] shadow-xl"
        >
          <div className="grid items-center gap-8 p-8 sm:p-10 lg:grid-cols-2 lg:gap-12 lg:p-12">
            <div className="text-white">
              <div className="mb-4 flex items-center gap-2 text-[#C5E1A5]">
                <Sparkles className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                  Experiencia interactiva
                </span>
              </div>
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                Arma tu bowl a tu gusto
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75 sm:text-base">
                Elige ingredientes y mira cómo se arma tu bowl en tiempo real.
                Base, vegetales, proteínas, toppings y salsa.
              </p>
              <Button variant="fresh" size="lg" className="mt-8" asChild>
                <Link href="/arma-tu-bowl">
                  Empezar a armar
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>

            <div className="relative mx-auto aspect-square w-full max-w-xs lg:max-w-sm">
              <div className="absolute inset-4 rounded-full bg-[#8BC34A]/20 blur-2xl" />
              <Image
                src="/images/bowl.png"
                alt="Preview arma tu bowl FRESKO"
                fill
                className="relative object-contain drop-shadow-2xl"
                sizes="(max-width: 768px) 80vw, 400px"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
