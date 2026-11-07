"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";

/**
 * Búsqueda por código (desde 4 caracteres, en todas las fechas) y fecha de entrega (hoy por
 * defecto). Filtran solas, sin botón.
 */
export function OrderFilters({ q, fecha }: { q: string; fecha: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [text, setText] = useState(q);
  const [pending, start] = useTransition();
  const last = useRef(q);

  const go = (patch: Record<string, string>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    start(() => router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false }));
  };

  // Busca al escribir más de 3 caracteres; si se borra, vuelve a la lista normal.
  useEffect(() => {
    const t = text.trim();
    const next = t.length > 3 ? t : "";
    if (next === last.current) return;
    const id = setTimeout(() => {
      last.current = next;
      go({ q: next });
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo reacciona al texto
  }, [text]);

  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <div className="relative w-full sm:w-auto">
        {pending ? (
          <Loader2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#1B1B1B]/35" />
        ) : (
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1B1B1B]/35" />
        )}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="FR-1001"
          aria-label="Buscar por código"
          className="h-9 w-full rounded-full border border-[#1F4D36]/12 bg-[#F8F7F2] pl-9 pr-8 text-sm outline-none focus:border-[#8BC34A] focus:bg-white sm:w-36"
        />
        {text && (
          <button type="button" onClick={() => setText("")} aria-label="Limpiar búsqueda" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#1B1B1B]/35 hover:text-[#1F4D36]">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <DatePicker
        value={fecha}
        onChange={(d) => go({ fecha: d, q: "" })}
        aria-label="Fecha de entrega"
        className="min-w-0 flex-1 sm:w-48 sm:flex-none"
      />
    </div>
  );
}
