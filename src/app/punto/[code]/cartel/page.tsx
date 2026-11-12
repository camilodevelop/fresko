import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { PrintButton } from "@/components/points/PrintButton";
import { getPublicPointMenu } from "@/lib/data/catalog";

export const metadata: Metadata = { title: "Cartel del punto | FRESKO", robots: { index: false } };

/** Cartel imprimible (carta/A4) con el QR del punto. */
export default async function CartelPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const menu = await getPublicPointMenu(code);
  if (!menu) notFound();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const url = `${proto}://${host}/punto/${code}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1F4D36", light: "#FFFFFF" } });

  return (
    <main className="flex min-h-dvh flex-col items-center bg-[#F4F2EC] px-4 py-8 print:bg-white print:p-0">
      <style>{`@page { size: auto; margin: 12mm; } @media print { body { background: #fff; } }`}</style>
      <div className="mb-6 print:hidden">
        <PrintButton />
      </div>
      <article className="flex w-full max-w-[560px] flex-col items-center rounded-[2rem] bg-white px-10 py-12 text-center shadow-xl print:max-w-none print:rounded-none print:shadow-none">
        <Image src="/images/logo.png" alt="FRESKO" width={180} height={60} className="h-14 w-auto" priority />
        <p className="mt-8 text-sm font-bold uppercase tracking-[0.25em] text-[#8BC34A]">¿Antojo de algo fresco?</p>
        <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-[#1F4D36]">Escanea y mira lo que hay hoy</h1>
        <p className="mt-3 text-lg text-[#1B1B1B]/65">Bowls y ensaladas recién hechos en {menu.name}</p>
        <div className="mt-8 w-full max-w-[340px] rounded-3xl border-4 border-[#8BC34A] p-4" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="mt-5 text-sm font-semibold text-[#1F4D36]">{url.replace(/^https?:\/\//, "")}</p>
        {menu.schedule && <p className="mt-6 rounded-full bg-[#E8F3DC] px-5 py-2 text-base font-semibold text-[#1F4D36]">{menu.schedule}</p>}
        <p className="mt-8 text-sm text-[#1B1B1B]/50">Pídele tu plato al vendedor · También a domicilio en fresko</p>
      </article>
    </main>
  );
}
