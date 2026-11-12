import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarHeart, Clock, MapPin, Salad, Sparkles, Truck } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PointMenu } from "@/components/points/PointMenu";
import { getPublicPointMenu } from "@/lib/data/catalog";
import { cn } from "@/lib/utils";

// Lo disponible cambia con cada venta: se vuelve a consultar cada minuto.
export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const menu = await getPublicPointMenu(code);
  return {
    title: menu ? `${menu.name} | FRESKO` : "Punto FRESKO",
    description: "Mira los bowls y ensaladas FRESKO disponibles hoy en este punto y conoce todo lo que tenemos para ti.",
    robots: { index: false },
  };
}

const EXPLORE = [
  { href: "/menu", icon: Truck, title: "Pide a domicilio", text: "Todo el menú FRESKO en tu casa u oficina, en la franja que elijas." },
  { href: "/arma-tu-bowl", icon: Sparkles, title: "Arma tu bowl", text: "Elige base, vegetales, proteínas y salsa. Lo ves armarse en vivo." },
  { href: "/#suscripciones", icon: CalendarHeart, title: "Planes semanales", text: "Tu almuerzo resuelto toda la semana, con descuento." },
  { href: "/", icon: Salad, title: "Conoce FRESKO", text: "Quiénes somos, cobertura y cómo preparamos cada plato." },
];

/** Página del QR de un punto de venta: qué hay hoy aquí y, de paso, todo FRESKO. */
export default async function PuntoPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const menu = await getPublicPointMenu(code);
  if (!menu) notFound();
  // Solo lo que hay ahora en el punto (vigente y sin agotar).
  const available = menu.selling ? menu.items.filter((i) => i.available > 0) : [];
  const availableCount = available.length;

  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#C5E1A5]/25 via-transparent to-transparent" />

        <section className="relative pb-8 pt-24 sm:pb-12 sm:pt-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8BC34A]">Estás en un punto FRESKO</p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-[#1F4D36] sm:text-5xl">{menu.name}</h1>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold",
                  menu.selling ? "bg-[#E8F3DC] text-[#2E6B1F]" : "bg-[#1B1B1B]/[0.06] text-[#1B1B1B]/60"
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", menu.selling ? "animate-pulse bg-[#7CB342]" : "bg-[#1B1B1B]/30")} />
                {menu.selling ? (availableCount ? "Vendiendo ahora" : "Por hoy se vendió todo") : "Ahora no estamos vendiendo aquí"}
              </span>
              {menu.schedule && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[#1F4D36] shadow-sm">
                  <Clock className="h-4 w-4" /> {menu.schedule}
                </span>
              )}
              {menu.address && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[#1F4D36] shadow-sm">
                  <MapPin className="h-4 w-4" /> {menu.address}
                </span>
              )}
            </div>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#1B1B1B]/65 sm:text-lg">
              {availableCount
                ? "Estos son los bowls y ensaladas que hay ahora en este punto. Toca uno para ver qué lleva, su información nutricional y alérgenos, y pídeselo al vendedor."
                : menu.selling
                  ? "Por hoy se vendió todo en este punto. Puedes pedir FRESKO a domicilio y te lo llevamos."
                  : "En este momento no hay platos en este punto. Mientras volvemos, puedes pedir FRESKO a domicilio."}
            </p>
          </div>
        </section>

        <section className="relative pb-16" aria-label="Platos del punto">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {availableCount === 0 ? (
              <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
                <p className="font-display text-xl font-bold text-[#1F4D36]">{menu.selling ? "¡Se vendió todo por hoy!" : "Hoy aún no hay platos aquí"}</p>
                <p className="mt-2 text-[#1B1B1B]/60">Pide a domicilio y te lo llevamos en la franja que elijas.</p>
                <Link href="/menu" className="mt-5 inline-flex h-12 items-center gap-2 rounded-full bg-[#1F4D36] px-6 text-sm font-semibold text-white hover:bg-[#163a29]">
                  Ver el menú a domicilio <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <PointMenu items={available} />
            )}
          </div>
        </section>

        <section className="relative border-t border-[#1F4D36]/8 bg-white/60 py-16" aria-label="Conoce FRESKO">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8BC34A]">Hay más FRESKO para ti</p>
            <h2 className="mt-2 font-display text-3xl font-bold text-[#1F4D36]">¿Te gustó? Llévalo a donde estés</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {EXPLORE.map((e) => (
                <Link key={e.href} href={e.href} className="group rounded-3xl border border-[#1F4D36]/10 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F3DC] text-[#1F4D36]">
                    <e.icon className="h-6 w-6" />
                  </span>
                  <p className="mt-4 font-display text-lg font-bold text-[#1F4D36]">{e.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#1B1B1B]/60">{e.text}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#7CB342]">
                    Ver <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
