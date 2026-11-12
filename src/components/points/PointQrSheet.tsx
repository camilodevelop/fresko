"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, ExternalLink, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/lib/notify";
import type { PointRow } from "@/lib/points";

/** QR del punto: lleva al cliente a la página pública con los platos de hoy. */
export function PointQrSheet({ point, onClose }: { point: PointRow; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [png, setPng] = useState("");

  useEffect(() => {
    const link = `${window.location.origin}/punto/${point.publicCode}`;
    let alive = true;
    QRCode.toDataURL(link, { width: 1024, margin: 2, errorCorrectionLevel: "M", color: { dark: "#1F4D36", light: "#FFFFFF" } }).then((data) => {
      if (!alive) return;
      setUrl(link);
      setPng(data);
    });
    return () => {
      alive = false;
    };
  }, [point.publicCode]);

  const slug = point.name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return (
    <Sheet title={`QR de ${point.name}`} description="Ponlo en el punto: al escanearlo, el cliente ve los platos disponibles hoy y puede conocer todo FRESKO." onClose={onClose}>
      <div className="space-y-4">
        <div className="mx-auto flex aspect-square w-full max-w-[280px] items-center justify-center rounded-3xl border border-[#1F4D36]/10 bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen generada en el navegador */}
          {png ? <img src={png} alt={`QR de ${point.name}`} className="h-full w-full" /> : <span className="text-sm text-[#1B1B1B]/40">Generando…</span>}
        </div>
        <p className="break-all rounded-2xl bg-[#F4F8F2] px-4 py-3 text-center text-sm font-semibold text-[#1F4D36]">{url || "…"}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button asChild variant="secondary" disabled={!png}>
            <a href={png} download={`qr-fresko-${slug}.png`}>
              <Download className="h-4 w-4" /> Descargar QR
            </a>
          </Button>
          <Button asChild>
            <a href={`/punto/${point.publicCode}/cartel`} target="_blank" rel="noopener noreferrer">
              <Printer className="h-4 w-4" /> Imprimir cartel
            </a>
          </Button>
          <Button
            variant="ghost"
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              toast.success("Enlace copiado.");
            }}
          >
            <Copy className="h-4 w-4" /> Copiar enlace
          </Button>
          <Button asChild variant="ghost">
            <a href={`/punto/${point.publicCode}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" /> Ver la página
            </a>
          </Button>
        </div>
        {!point.active && <p className="text-sm text-amber-800">Este punto está inactivo: la página no se muestra hasta activarlo.</p>}
      </div>
    </Sheet>
  );
}
