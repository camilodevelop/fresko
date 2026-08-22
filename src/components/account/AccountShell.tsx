"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { FRESKO_DEMO_USER_KEY } from "@/lib/auth-demo";
import { ACCOUNT_NAV } from "@/lib/data/account";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = () => {
    window.localStorage.removeItem(FRESKO_DEMO_USER_KEY);
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#F8F7F2]">
      <header className="border-b border-[#1F4D36]/8 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/cuenta" className="flex items-center gap-3">
            <Image
              src="/images/logo.png"
              alt="FRESKO"
              width={160}
              height={48}
              className="h-9 w-auto object-contain"
            />
            <span className="hidden text-xs font-semibold uppercase tracking-wider text-[#1F4D36]/50 sm:inline">
              Mi cuenta
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" asChild>
              <Link href="/">Ir al sitio</Link>
            </Button>
            <Button size="sm" variant="secondary" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:px-8">
        <aside className="w-full shrink-0 lg:w-60">
          <nav className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
            {ACCOUNT_NAV.map((item) => {
              const active =
                item.href === "/cuenta"
                  ? pathname === "/cuenta"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors lg:rounded-2xl",
                    active
                      ? "bg-[#1F4D36] text-white"
                      : "bg-white text-[#1F4D36]/70 hover:bg-[#1F4D36]/5"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
