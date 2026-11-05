import { Suspense } from "react";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MenuPageContent } from "@/components/menu/MenuPageContent";
import { getCategories, getMenuItems } from "@/lib/data/catalog";

// El catálogo se edita en el panel; se regenera al guardar y cada 5 min.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Menú | FRESKO — Bowls y ensaladas en Bogotá",
  description:
    "Explora nuestro menú completo: bowls Basic, Premium y Full / Pokes. Ingredientes frescos, precios desde $9.500.",
};

export default async function MenuPage() {
  const [items, categories] = await Promise.all([getMenuItems(), getCategories()]);
  return (
    <>
      <Navbar />
      <main>
        <Suspense
          fallback={
            <div className="flex min-h-[50vh] items-center justify-center pt-32 text-[#1F4D36]/50">
              Cargando menú...
            </div>
          }
        >
          <MenuPageContent items={items} categories={categories} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
