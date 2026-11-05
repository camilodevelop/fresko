"use client";

import { Toaster as Sonner } from "sonner";

/** Notificaciones toast con el estilo de FRESKO (montado una vez en el layout raíz). */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      closeButton
      richColors
      duration={3500}
      gap={10}
      offset={20}
      mobileOffset={12}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-2xl !border !shadow-xl !shadow-[#1F4D36]/10 !font-sans !text-sm !px-4 !py-3.5 !gap-3",
          title: "!font-semibold",
          description: "!text-[13px] !opacity-80",
          success: "!bg-white !border-[#C5E1A5] !text-[#1F4D36] [&_[data-icon]]:!text-[#7CB342]",
          error: "!bg-white !border-red-200 !text-red-800 [&_[data-icon]]:!text-red-600",
          warning: "!bg-white !border-amber-200 !text-amber-900 [&_[data-icon]]:!text-amber-500",
          info: "!bg-white !border-[#1F4D36]/10 !text-[#1F4D36] [&_[data-icon]]:!text-[#1F4D36]",
          closeButton: "!bg-white !border-[#1F4D36]/10 !text-[#1B1B1B]/50 hover:!text-[#1F4D36]",
          actionButton: "!bg-[#1F4D36] !text-white !rounded-full",
        },
      }}
    />
  );
}
