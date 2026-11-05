"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type SectionTab = {
  href: string;
  label: string;
  /** Rutas extra que también marcan la pestaña como activa (p. ej. el detalle de un producto). */
  match?: RegExp;
  exact?: boolean;
};

export function SectionTabs({ tabs }: { tabs: SectionTab[] }) {
  const pathname = usePathname();
  const isActive = (t: SectionTab) =>
    t.exact ? pathname === t.href || Boolean(t.match?.test(pathname)) : pathname.startsWith(t.href) || Boolean(t.match?.test(pathname));

  return (
    <div className="mb-8 flex gap-1 overflow-x-auto rounded-2xl bg-white p-1 ring-1 ring-[#1F4D36]/[0.07]">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
            isActive(tab) ? "bg-[#1F4D36] text-white" : "text-[#1B1B1B]/55 hover:bg-[#F4F8F2] hover:text-[#1F4D36]"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
