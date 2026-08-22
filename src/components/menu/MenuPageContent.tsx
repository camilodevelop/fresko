"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MenuProductCard } from "@/components/menu/MenuProductCard";
import {
  MENU_ITEMS,
  MENU_TABS,
  type MenuCategory,
} from "@/lib/data/products";
import { WHATSAPP_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

const VALID_CATEGORIES = new Set<MenuCategory>(["all", "ensaladas", "bowls"]);

function parseCategory(param: string | null): MenuCategory {
  if (param && VALID_CATEGORIES.has(param as MenuCategory)) {
    return param as MenuCategory;
  }
  return "all";
}

export function MenuPageContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<MenuCategory>("all");

  useEffect(() => {
    setActiveTab(parseCategory(searchParams.get("categoria")));
  }, [searchParams]);

  const filteredItems = useMemo(() => {
    if (activeTab === "all") return MENU_ITEMS;
    return MENU_ITEMS.filter((item) => item.category === activeTab);
  }, [activeTab]);

  return (
    <>
      <section className="relative overflow-hidden border-b border-[#1F4D36]/8 bg-[#F8F7F2] pt-24 pb-12 sm:pt-28 sm:pb-16">
        <div className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full bg-[#C5E1A5]/50 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[#8BC34A]">
                <Leaf className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                  Nuestro menú
                </span>
              </div>
              <h1 className="font-display text-4xl font-bold tracking-tight text-[#1F4D36] sm:text-5xl">
                Bowls & ensaladas
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-[#1B1B1B]/70 sm:text-lg">
                Recetas frescas preparadas al momento. Filtra por categoría y pide
                directo por WhatsApp.
              </p>
            </div>
            <Button size="lg" asChild className="shrink-0">
              <Link href="/carrito">
                Ver carrito
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-none"
            role="tablist"
            aria-label="Categorías del menú"
          >
            {MENU_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "shrink-0 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all",
                  activeTab === tab.id
                    ? "bg-[#1F4D36] text-white shadow-md"
                    : "bg-white text-[#1F4D36]/70 hover:bg-[#1F4D36]/5"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {filteredItems.map((item, i) => (
                <MenuProductCard
                  key={item.id}
                  item={item}
                  index={i}
                  animation="list"
                />
              ))}
            </motion.div>
          </AnimatePresence>

          {filteredItems.length === 0 && (
            <p className="mt-12 text-center text-[#1B1B1B]/50">
              No hay productos en esta categoría.
            </p>
          )}

          <div className="mt-14 rounded-3xl bg-[#1F4D36] p-8 text-center text-white sm:p-10">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              ¿Quieres personalizar todo?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/70">
              Arma tu bowl con la combinación perfecta de ingredientes frescos.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button variant="fresh" size="lg" asChild>
                <Link href="/arma-tu-bowl">Arma tu bowl</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
                asChild
              >
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  Pedir por WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
