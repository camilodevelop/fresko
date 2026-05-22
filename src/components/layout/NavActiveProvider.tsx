"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useActiveNav } from "@/hooks/use-active-nav";

type NavActiveContextValue = ReturnType<typeof useActiveNav>;

const NavActiveContext = createContext<NavActiveContextValue | null>(null);

export function NavActiveProvider({ children }: { children: ReactNode }) {
  const value = useActiveNav();
  return (
    <NavActiveContext.Provider value={value}>{children}</NavActiveContext.Provider>
  );
}

export function useNavActive() {
  const ctx = useContext(NavActiveContext);
  if (!ctx) {
    throw new Error("useNavActive must be used within NavActiveProvider");
  }
  return ctx;
}
