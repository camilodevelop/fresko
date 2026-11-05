"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Panel con <dialog> nativo: en móvil sube desde abajo, en escritorio se centra.
 * Atrapa el foco, cierra con Escape o clic en el fondo. Se monta abierto; para cerrarlo, desmóntalo.
 */
export function Sheet({
  title,
  description,
  onClose,
  footer,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    // Sin dialog.close() aquí: en desarrollo React monta los efectos dos veces y el
    // evento "close" cerraría el panel recién abierto.
    return () => {
      root.style.overflow = previous;
    };
  }, []);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "mb-0 mt-auto max-h-[92dvh] w-full max-w-full overflow-hidden rounded-t-[1.75rem] bg-white p-0 text-left shadow-2xl shadow-[#1F4D36]/25 backdrop:bg-[#10291D]/45 backdrop:backdrop-blur-sm",
        "md:m-auto md:max-h-[88dvh] md:w-[min(680px,calc(100%-3rem))] md:rounded-3xl",
        className
      )}
    >
      <div className="flex max-h-[92dvh] flex-col md:max-h-[88dvh]">
        <div className="relative flex items-start justify-between gap-4 border-b border-[#1F4D36]/[0.06] px-5 pb-4 pt-5 sm:px-6">
          <span className="absolute left-1/2 top-2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-[#1F4D36]/15 md:hidden" aria-hidden />
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-[#1F4D36]">{title}</h2>
            {description && <div className="mt-0.5 text-sm text-[#1B1B1B]/50">{description}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-2 shrink-0 rounded-full p-2 text-[#1B1B1B]/40 transition-colors hover:bg-[#F4F8F2] hover:text-[#1F4D36]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="border-t border-[#1F4D36]/[0.06] bg-white px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-6">{footer}</div>
        )}
      </div>
    </dialog>
  );
}
