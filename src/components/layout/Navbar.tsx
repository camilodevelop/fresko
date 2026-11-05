"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { NavActiveProvider } from "@/components/layout/NavActiveProvider";
import { NavLink } from "@/components/layout/NavLink";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { CartNavButton } from "@/components/cart/CartNavButton";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useSignedIn } from "@/hooks/use-signed-in";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const signedIn = useSignedIn();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <NavActiveProvider>
      <header
        className={cn(
          "fixed top-0 z-50 w-full transition-all duration-300",
          mobileOpen && "bg-[#F8F7F2]/95 shadow-sm backdrop-blur-xl",
          !mobileOpen &&
            scrolled &&
            "border-b border-[#1F4D36]/8 bg-[#F8F7F2]/80 shadow-sm backdrop-blur-xl",
          !mobileOpen && !scrolled && "bg-transparent"
        )}
      >
        <nav
          className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8"
          aria-label="Principal"
        >
          <Link href="/" className="relative z-[60] flex shrink-0 items-center">
            <Image
              src="/images/logo.png"
              alt="FRESKO — Bowls y ensaladas"
              width={220}
              height={64}
              className="h-11 w-auto object-contain sm:h-12 md:h-14"
              priority
            />
          </Link>

          <ul className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <NavLink href={link.href} label={link.label} variant="desktop" />
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <CartNavButton />
            <Button size="sm" className="hidden sm:inline-flex" asChild>
              <Link href={signedIn ? "/cuenta" : "/login"}>
                {signedIn ? "Mi cuenta" : "Iniciar sesión"}
              </Link>
            </Button>
            <button
              type="button"
              className={cn(
                "relative z-[60] inline-flex h-10 w-10 items-center justify-center rounded-full transition-all lg:hidden",
                mobileOpen
                  ? "bg-[#1F4D36] text-white shadow-md"
                  : "text-[#1F4D36] hover:bg-[#1F4D36]/8"
              )}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </nav>
      </header>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </NavActiveProvider>
  );
}
