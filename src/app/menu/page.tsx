import { Suspense } from "react";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MenuPageContent } from "@/components/menu/MenuPageContent";

export const metadata: Metadata = {
  title: "Menú | FRESKO — Bowls y ensaladas en Bogotá",
  description:
    "Explora nuestro menú completo: bowls Basic, Premium y Full / Pokes. Ingredientes frescos, precios desde $9.500.",
};

export default function MenuPage() {
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
          <MenuPageContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
