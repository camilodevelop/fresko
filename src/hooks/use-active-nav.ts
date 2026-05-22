"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const HOME_SECTIONS = ["inicio", "cobertura", "suscripciones"] as const;

function hashFromHref(href: string): string {
  const idx = href.indexOf("#");
  if (idx === -1) return "";
  return href.slice(idx);
}

export function useActiveNav() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");
  const [activeSection, setActiveSection] = useState("inicio");
  const ratiosRef = useRef<Record<string, number>>({});

  const syncHash = useCallback(() => {
    if (typeof window === "undefined") return;
    setHash(window.location.hash);
  }, []);

  const setActiveFromHref = useCallback(
    (href: string) => {
      const h = hashFromHref(href);

      if (h) {
        setHash(h);
        setActiveSection(h.replace("#", ""));
        return;
      }

      if (href === "/") {
        setHash("");
        setActiveSection("inicio");
      }
    },
    []
  );

  useEffect(() => {
    syncHash();
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("popstate", syncHash);
    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("popstate", syncHash);
    };
  }, [syncHash]);

  useEffect(() => {
    syncHash();
    const t = window.setTimeout(syncHash, 0);
    return () => window.clearTimeout(t);
  }, [pathname, syncHash]);

  useEffect(() => {
    if (pathname !== "/") return;

    const pickSectionFromScroll = () => {
      if (window.location.hash) return;

      const nearBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 120;

      if (nearBottom) {
        setActiveSection("suscripciones");
        return;
      }

      const best = Object.entries(ratiosRef.current).sort(
        (a, b) => b[1] - a[1]
      )[0];

      if (best && best[1] > 0.05) {
        setActiveSection(best[0]);
      }
    };

    const observers: IntersectionObserver[] = [];

    HOME_SECTIONS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            ratiosRef.current[entry.target.id] = entry.intersectionRatio;
          });
          pickSectionFromScroll();
        },
        { rootMargin: "-20% 0px -30% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
      );

      observer.observe(el);
      observers.push(observer);
    });

    window.addEventListener("scroll", pickSectionFromScroll, { passive: true });
    pickSectionFromScroll();

    return () => {
      observers.forEach((o) => o.disconnect());
      window.removeEventListener("scroll", pickSectionFromScroll);
    };
  }, [pathname]);

  useEffect(() => {
    if (hash === "#cobertura") setActiveSection("cobertura");
    else if (hash === "#suscripciones") setActiveSection("suscripciones");
    else if (hash === "#inicio" || hash === "") {
      if (pathname === "/") setActiveSection("inicio");
    }
  }, [hash, pathname]);

  const isActive = useCallback(
    (href: string) => {
      if (href === "/menu") return pathname === "/menu";
      if (href === "/arma-tu-bowl") return pathname === "/arma-tu-bowl";

      if (pathname !== "/") return false;

      const currentHash = hash;

      if (currentHash) {
        if (href === "/") {
          return currentHash === "" || currentHash === "#inicio";
        }
        if (href === "/#cobertura") return currentHash === "#cobertura";
        if (href === "/#suscripciones") return currentHash === "#suscripciones";
        return false;
      }

      if (href === "/") return activeSection === "inicio";
      if (href === "/#cobertura") return activeSection === "cobertura";
      if (href === "/#suscripciones") return activeSection === "suscripciones";

      return false;
    },
    [pathname, hash, activeSection]
  );

  return { isActive, pathname, setActiveFromHref };
}
