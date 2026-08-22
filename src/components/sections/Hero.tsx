"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Leaf,
  ShoppingBag,
  Sparkles,
  Truck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WHATSAPP_URL } from "@/lib/constants";

const badges = [
  { icon: Truck, label: "Entrega programada" },
  { icon: Wallet, label: "Desde $10.000" },
  { icon: Leaf, label: "Ingredientes frescos" },
];

const heroStats = [
  { value: "15+", label: "Combos" },
  { value: "Gratis", label: "Envio" },
  { value: "4.9★", label: "Rating" },
];

export function Hero() {
  return (
    <section
      id="inicio"
      className="relative isolate overflow-hidden pt-24 pb-10 sm:pt-28 sm:pb-12 lg:pb-14"
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -right-32 top-20 h-80 w-80 rounded-full bg-[#C5E1A5]/30 blur-3xl" />
        <div className="absolute -left-24 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-[#8BC34A]/15 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="order-2 lg:order-1"
        >
          <Badge variant="fresh" className="mb-6">
            <Sparkles className="h-3 w-3" />
            Bogotá · Food-tech saludable
          </Badge>

          <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-[#1F4D36] sm:text-5xl lg:text-6xl">
            Fresco. Saludable.{" "}
            <span className="text-[#8BC34A]">
              Hecho para ti.
              <Leaf className="ml-1 inline h-8 w-8 align-middle sm:h-10 sm:w-10" />
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-base leading-relaxed text-[#1B1B1B]/70 sm:text-lg">
            Ensaladas y bowls con ingredientes frescos y balanceados,
            preparados cada día. Programa tu pedido y recíbelo gratis y a
            tiempo.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button size="lg" asChild>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <ShoppingBag className="h-5 w-5" />
                Pedir ahora
              </a>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/arma-tu-bowl">Arma tu bowl</Link>
            </Button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-[#1F4D36]/10 pt-8 sm:mt-12"
            aria-label="Datos destacados"
          >
            {heroStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 + i * 0.08 }}
                className="text-center sm:text-left"
              >
                <p className="font-display text-2xl font-bold tracking-tight text-[#1F4D36] sm:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#1B1B1B]/45 sm:text-xs">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </motion.div>

          <div className="mt-8 flex flex-wrap gap-2">
            {badges.map((badge, i) => (
              <motion.div
                key={badge.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                <Badge variant="cream">
                  <badge.icon className="h-3.5 w-3.5 text-[#8BC34A]" />
                  {badge.label}
                </Badge>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative z-10 order-1 mx-auto w-full max-w-md lg:order-2 lg:max-w-none"
        >
          <div className="relative aspect-square overflow-hidden">
            <div className="absolute inset-8 rounded-full bg-gradient-to-br from-[#C5E1A5]/35 to-[#8BC34A]/15 blur-xl" />
            <Image
              src="/images/bowl.png"
              alt="Bowl FRESKO premium con ingredientes frescos"
              fill
              className="relative z-10 object-contain drop-shadow-2xl"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, type: "spring", stiffness: 260, damping: 22 }}
            className="absolute -right-1 top-4 z-20 sm:right-0 sm:top-10 lg:-right-4 lg:top-12"
          >
            <div className="relative h-24 w-24 sm:h-28 sm:w-28 lg:h-[7.5rem] lg:w-[7.5rem]">
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full border border-dashed border-[#1F4D36]/20 bg-gradient-to-b from-white via-white to-[#F7FAF5] text-center shadow-[0_10px_36px_-10px_rgba(31,77,54,0.22)]">
                <Leaf
                  className="mb-1 h-3.5 w-3.5 text-[#8BC34A]"
                  strokeWidth={2.25}
                  aria-hidden
                />
                <p className="font-display text-[10px] font-bold leading-none tracking-tight text-[#1F4D36] lg:text-[11px]">
                  <span className="text-[#8BC34A]">100%</span> fresco
                </p>
                <div className="my-1.5 h-px w-8 bg-[#1F4D36]/12" aria-hidden />
                <p className="max-w-[5.5rem] font-display text-[8px] font-semibold leading-[1.25] text-[#1F4D36] lg:text-[9px]">
                  Ingredientes seleccionados
                </p>
                <p className="mt-1 text-[7px] font-medium uppercase tracking-[0.12em] text-[#1B1B1B]/50 lg:text-[8px]">
                  Todos los días
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
