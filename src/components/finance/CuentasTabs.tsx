"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Pestañas del módulo de cuentas (las de registro solo para quien administra las cuentas). */
export function CuentasTabs({ canManage }: { canManage: boolean }) {
  const path = usePathname();
  const tabs = [
    { href: "/admin/cuentas", label: "Resumen" },
    { href: "/admin/cuentas/cajas", label: "Cierres de caja" },
    ...(canManage
      ? [
          { href: "/admin/cuentas/gastos", label: "Gastos e ingresos" },
          { href: "/admin/cuentas/nomina", label: "Nómina" },
        ]
      : []),
  ];
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-[#1F4D36]/10" aria-label="Cuentas">
      {tabs.map((t) => {
        const on = t.href === "/admin/cuentas" ? path === t.href : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition",
              on ? "border-[#1F4D36] text-[#1F4D36]" : "border-transparent text-[#1B1B1B]/50 hover:text-[#1F4D36]"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
