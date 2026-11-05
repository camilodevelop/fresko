"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sidebar, type SidebarUser } from "./Sidebar";
import { Topbar } from "./Topbar";
import { SIDEBAR_COOKIE, type NavGroup } from "./types";

/** Maneja el menú colapsado (persistido en cookie para que no parpadee al recargar). */
export function DashboardFrame({
  title,
  homeHref,
  profileHref,
  groups,
  user,
  initialCollapsed,
  children,
}: {
  title: string;
  homeHref: string;
  profileHref: string;
  groups: NavGroup[];
  user: SidebarUser;
  initialCollapsed: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <>
      <Sidebar title={title} homeHref={homeHref} groups={groups} user={user} collapsed={collapsed} onToggle={toggle} />
      <div className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-20" : "lg:pl-72")}>
        <div className="relative isolate">
          {/* Franja decorativa suave detrás de la barra y el encabezado */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#EFF5EA] via-[#F3F7EF]/60 to-transparent" />
            <div className="absolute -top-32 right-[8%] h-80 w-80 rounded-full bg-[#8BC34A]/[0.07] blur-3xl" />
            <div className="absolute -top-20 left-[15%] h-56 w-56 rounded-full bg-[#C5E1A5]/20 blur-3xl" />
            <div className="absolute inset-0 opacity-[0.12] [background-image:radial-gradient(#1F4D36_0.6px,transparent_0.6px)] [background-size:18px_18px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
          </div>

          <Topbar title={title} homeHref={homeHref} groups={groups} user={user} profileHref={profileHref} />
          <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-6 lg:pt-10 xl:px-8">{children}</main>
        </div>
      </div>
    </>
  );
}
