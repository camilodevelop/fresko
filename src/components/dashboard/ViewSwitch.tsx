import Link from "next/link";
import { cn } from "@/lib/utils";

/** Selector de vistas dentro de una pestaña (p. ej. Productos | Categorías). */
export function ViewSwitch({
  items,
}: {
  items: { href: string; label: string; active: boolean; count?: number }[];
}) {
  return (
    <div className="mb-5 inline-flex gap-1 rounded-full bg-white p-1 ring-1 ring-[#1F4D36]/[0.07]">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
            item.active ? "bg-[#E8F3DC] text-[#1F4D36]" : "text-[#1B1B1B]/50 hover:text-[#1F4D36]"
          )}
        >
          {item.label}
          {item.count !== undefined && (
            <span className={cn("rounded-full px-1.5 text-[11px]", item.active ? "bg-white/80" : "bg-[#F4F8F2]")}>{item.count}</span>
          )}
        </Link>
      ))}
    </div>
  );
}
