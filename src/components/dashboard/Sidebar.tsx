"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Boxes,
  CalendarClock,
  ChefHat,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  Home,
  LogOut,
  MapPin,
  Menu,
  Package,
  Repeat,
  Salad,
  Shield,
  Truck,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";
import type { NavGroup, NavIcon } from "./types";
import { NotificationBell } from "./Notifications";
import { UserAvatar } from "./UserAvatar";

const ICONS: Record<NavIcon, LucideIcon> = {
  home: Home,
  package: Package,
  repeat: Repeat,
  calendar: CalendarClock,
  map: MapPin,
  user: UserRound,
  users: Users,
  shield: Shield,
  chef: ChefHat,
  truck: Truck,
  salad: Salad,
  boxes: Boxes,
};

export type SidebarUser = {
  name: string;
  email: string | null;
  avatarUrl: string | null;
  badge: string;
};

type SidebarProps = {
  title: string;
  homeHref: string;
  groups: NavGroup[];
  user: SidebarUser;
};

function isActive(pathname: string, href: string, homeHref: string) {
  return href === homeHref ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** Etiqueta flotante a la derecha para el modo colapsado. */
function Tip({ label, show }: { label: string; show: boolean }) {
  if (!show) return null;
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#1B1B1B] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {label}
    </span>
  );
}

function SidebarContent({
  title,
  homeHref,
  groups,
  user,
  collapsed = false,
  onNavigate,
}: SidebarProps & { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const itemBase = cn(
    "group relative flex items-center rounded-xl py-2.5 text-sm font-medium transition-colors",
    collapsed ? "justify-center px-0" : "gap-3 px-3"
  );

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-16 items-center", collapsed ? "justify-center px-0" : "gap-3 px-6")}>
        <Link href={homeHref} onClick={onNavigate} className="flex items-center gap-2.5" aria-label="FRESKO">
          {collapsed ? (
            <span className="block h-10 w-[42px] overflow-hidden">
              {/* Solo el bowl del logo (la parte izquierda de la imagen) */}
              <Image src="/images/logo.png" alt="FRESKO" width={115} height={40} className="h-10 w-auto max-w-none" />
            </span>
          ) : (
            <>
              <Image src="/images/logo.png" alt="FRESKO" width={120} height={42} className="h-8 w-auto object-contain" />
              <span className="rounded-full bg-[#F4F8F2] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1F4D36]/70">
                {title}
              </span>
            </>
          )}
        </Link>
      </div>

      {collapsed ? (
        <div className="group relative mx-auto mb-2">
          <UserAvatar name={user.name} email={user.email} src={user.avatarUrl} size={40} />
          <Tip label={user.name || user.email || ""} show />
        </div>
      ) : (
        <div className="mx-4 mb-2 flex items-center gap-3 rounded-2xl bg-[#F4F8F2] p-3">
          <UserAvatar name={user.name} email={user.email} src={user.avatarUrl} size={40} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#1F4D36]">{user.name || user.email}</p>
            <p className="truncate text-xs text-[#1F4D36]/60">{user.badge}</p>
          </div>
        </div>
      )}

      <nav
        className={cn("flex-1 py-4", collapsed ? "space-y-3 px-3" : "space-y-6 overflow-y-auto px-4")}
        aria-label={title}
      >
        {groups.map((group, gi) => (
          <div key={group.label}>
            {collapsed ? (
              gi > 0 && <div className="mx-auto mb-3 h-px w-8 bg-[#1F4D36]/10" />
            ) : (
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#1B1B1B]/35">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon];
                const active = isActive(pathname, item.href, homeHref);
                if (item.soon) {
                  return (
                    <li key={item.href}>
                      <span
                        className={cn(itemBase, "cursor-not-allowed text-[#1B1B1B]/30")}
                        title={collapsed ? undefined : "Disponible en una próxima fase"}
                        tabIndex={collapsed ? 0 : undefined}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                        {!collapsed && (
                          <>
                            <span className="flex-1">{item.label}</span>
                            <span className="rounded-full bg-[#1B1B1B]/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                              Pronto
                            </span>
                          </>
                        )}
                        <Tip label={`${item.label} · Pronto`} show={collapsed} />
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      className={cn(
                        itemBase,
                        active
                          ? "bg-[#1F4D36] text-white shadow-sm shadow-[#1F4D36]/20"
                          : "text-[#1B1B1B]/65 hover:bg-[#F4F8F2] hover:text-[#1F4D36]"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] transition-colors",
                          active ? "text-[#C5E1A5]" : "text-[#1F4D36]/45 group-hover:text-[#1F4D36]"
                        )}
                      />
                      {!collapsed && item.label}
                      <Tip label={item.label} show={collapsed} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn("space-y-0.5 border-t border-[#1F4D36]/8", collapsed ? "p-3" : "p-4")}>
        <Link
          href="/"
          onClick={onNavigate}
          aria-label={collapsed ? "Ir al sitio" : undefined}
          className={cn(itemBase, "text-[#1B1B1B]/65 hover:bg-[#F4F8F2] hover:text-[#1F4D36]")}
        >
          <ExternalLink className="h-[18px] w-[18px] text-[#1F4D36]/45" />
          {!collapsed && "Ir al sitio"}
          <Tip label="Ir al sitio" show={collapsed} />
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            aria-label={collapsed ? "Cerrar sesión" : undefined}
            className={cn(itemBase, "w-full text-[#1B1B1B]/65 hover:bg-red-50 hover:text-red-700")}
          >
            <LogOut className="h-[18px] w-[18px] opacity-60" />
            {!collapsed && "Cerrar sesión"}
            <Tip label="Cerrar sesión" show={collapsed} />
          </button>
        </form>
      </div>
    </div>
  );
}

export function Sidebar({
  collapsed,
  onToggle,
  ...props
}: SidebarProps & { collapsed: boolean; onToggle: () => void }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const current = props.groups.flatMap((g) => g.items).find((i) => isActive(pathname, i.href, props.homeHref));

  return (
    <>
      {/* Escritorio: barra fija, colapsable a solo íconos */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-[#1F4D36]/8 bg-white transition-[width] duration-200 lg:block",
          collapsed ? "w-20" : "w-72"
        )}
      >
        <SidebarContent {...props} collapsed={collapsed} />
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          className="absolute -right-3.5 top-[4.5rem] z-50 flex h-7 w-7 items-center justify-center rounded-full border border-[#1F4D36]/10 bg-white text-[#1F4D36]/60 shadow-sm transition-colors hover:bg-[#1F4D36] hover:text-white"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* Móvil: barra superior + cajón */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[#1F4D36]/8 bg-white/90 px-4 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#1F4D36] hover:bg-[#F4F8F2]"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <p className="font-display text-sm font-bold text-[#1F4D36]">{current?.label ?? props.title}</p>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <UserAvatar name={props.user.name} email={props.user.email} src={props.user.avatarUrl} size={32} />
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-[#1B1B1B]/40 backdrop-blur-sm"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[85%] max-w-xs bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3.5 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-[#1F4D36] hover:bg-[#F4F8F2]"
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent {...props} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
