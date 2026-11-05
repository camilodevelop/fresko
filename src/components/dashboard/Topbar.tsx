"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChevronRight, Home } from "lucide-react";
import type { NavGroup } from "./types";
import { NotificationBell } from "./Notifications";
import { UserMenu } from "./UserMenu";
import type { SidebarUser } from "./Sidebar";

const SUBSECTIONS: Record<string, string> = {
  nueva: "Nueva",
  nuevo: "Nuevo",
  ingredientes: "Ingredientes",
  categorias: "Categorías",
  planes: "Planes",
  precios: "Precios sugeridos",
  armador: "Armador",
  ajustes: "Ajustes",
};

function crumbs(pathname: string, homeHref: string, groups: NavGroup[]) {
  const match = groups
    .flatMap((g) => g.items)
    .filter((i) => i.href !== homeHref && (pathname === i.href || pathname.startsWith(`${i.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (!match) return [];
  const list: { label: string; href?: string }[] = [{ label: match.label, href: match.href }];
  if (pathname !== match.href) {
    // Catálogo › Ingredientes › Detalle: cada nivel enlaza salvo el último.
    const segments = pathname.slice(match.href.length + 1).split("/").filter(Boolean);
    let href = match.href;
    segments.forEach((segment, i) => {
      href += `/${segment}`;
      const last = i === segments.length - 1;
      list.push({ label: SUBSECTIONS[segment] ?? "Detalle", href: last ? undefined : href });
    });
  }
  return list;
}

/** Barra superior de ancho completo (solo escritorio; en móvil está la cabecera del Sidebar). */
export function Topbar({
  title,
  homeHref,
  groups,
  user,
  profileHref,
}: {
  title: string;
  homeHref: string;
  groups: NavGroup[];
  user: SidebarUser;
  profileHref: string;
}) {
  const pathname = usePathname();
  const trail = crumbs(pathname, homeHref, groups);
  const raw = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Bogota",
  }).format(new Date());
  const today = raw.charAt(0).toUpperCase() + raw.slice(1);

  return (
    <header className="sticky top-0 z-30 hidden h-16 border-b border-[#1F4D36]/[0.07] bg-white/85 backdrop-blur-xl lg:block">
      <div className="flex h-full items-center justify-between gap-4 px-6 xl:px-8">
        <nav aria-label="Ruta" className="flex min-w-0 items-center gap-1 text-sm">
          <Link
            href={homeHref}
            className={
              trail.length
                ? "flex items-center gap-2 rounded-xl px-3 py-2 text-[#1B1B1B]/50 transition-colors hover:bg-[#F4F8F2] hover:text-[#1F4D36]"
                : "flex items-center gap-2 rounded-xl bg-[#F4F8F2] px-3 py-2 font-semibold text-[#1F4D36]"
            }
          >
            <Home className="h-4 w-4" />
            {title}
          </Link>
          {trail.map((c, i) => {
            const last = i === trail.length - 1;
            return (
              <span key={i} className="flex min-w-0 items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#1B1B1B]/20" />
                {last ? (
                  <span className="truncate rounded-xl bg-[#F4F8F2] px-3 py-2 font-semibold text-[#1F4D36]">{c.label}</span>
                ) : (
                  <Link
                    href={c.href!}
                    className="truncate rounded-xl px-3 py-2 text-[#1B1B1B]/50 transition-colors hover:bg-[#F4F8F2] hover:text-[#1F4D36]"
                  >
                    {c.label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden items-center gap-2 px-3 text-xs font-medium text-[#1B1B1B]/50 xl:flex">
            <CalendarDays className="h-4 w-4 text-[#7CB342]" />
            {today}
          </span>
          <span className="hidden h-7 w-px bg-[#1F4D36]/10 xl:block" />
          <NotificationBell />
          <span className="h-7 w-px bg-[#1F4D36]/10" />
          <UserMenu user={user} profileHref={profileHref} />
        </div>
      </div>
    </header>
  );
}
