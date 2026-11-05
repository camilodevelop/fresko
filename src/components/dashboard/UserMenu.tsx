"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";
import type { SidebarUser } from "./Sidebar";
import { UserAvatar } from "./UserAvatar";

export function UserMenu({ user, profileHref }: { user: SidebarUser; profileHref: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemClass =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-[#F4F8F2]",
          open && "bg-[#F4F8F2]"
        )}
      >
        <UserAvatar name={user.name} email={user.email} src={user.avatarUrl} size={32} />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-[150px] truncate text-sm font-semibold text-[#1F4D36]">
            {user.name.split(" ")[0] || user.email}
          </span>
          <span className="block max-w-[150px] truncate text-[11px] text-[#1B1B1B]/45">{user.badge}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-[#1B1B1B]/40 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl bg-white p-1.5 shadow-2xl shadow-[#1F4D36]/15 ring-1 ring-[#1F4D36]/[0.08]"
        >
          <div className="flex items-center gap-3 rounded-xl bg-[#F8F7F2] px-3 py-3">
            <UserAvatar name={user.name} email={user.email} src={user.avatarUrl} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#1F4D36]">{user.name || "Sin nombre"}</p>
              <p className="truncate text-xs text-[#1B1B1B]/50">{user.email}</p>
            </div>
          </div>
          <div className="my-1.5 h-px bg-[#1F4D36]/[0.06]" />
          <Link
            href={profileHref}
            role="menuitem"
            onClick={() => setOpen(false)}
            className={cn(itemClass, "text-[#1B1B1B]/75 hover:bg-[#F4F8F2] hover:text-[#1F4D36]")}
          >
            <UserRound className="h-[18px] w-[18px] text-[#1F4D36]/50" />
            Mi perfil
          </Link>
          <form action={signOut}>
            <button type="submit" role="menuitem" className={cn(itemClass, "text-red-700 hover:bg-red-50")}>
              <LogOut className="h-[18px] w-[18px]" />
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
