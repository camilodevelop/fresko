"use client";

import Link from "next/link";
import { useNavActive } from "@/components/layout/NavActiveProvider";
import { cn } from "@/lib/utils";

type NavLinkProps = {
  href: string;
  label: string;
  variant?: "desktop" | "mobile";
  onClick?: () => void;
};

export function NavLink({
  href,
  label,
  variant = "desktop",
  onClick,
}: NavLinkProps) {
  const { isActive, setActiveFromHref } = useNavActive();
  const active = isActive(href);

  return (
    <Link
      href={href}
      onClick={() => {
        setActiveFromHref(href);
        onClick?.();
      }}
      aria-current={active ? "page" : undefined}
      className={cn(
        "border-b-2 transition-colors duration-200",
        variant === "desktop" &&
          "px-1 py-2 text-xs uppercase tracking-wide",
        variant === "mobile" &&
          "block px-1 py-3 font-display text-lg uppercase tracking-wide",
        active
          ? "border-[#1F4D36] font-bold text-[#1F4D36]"
          : cn(
              "border-transparent font-semibold text-[#1F4D36]/70",
              "hover:border-[#1F4D36]/20 hover:text-[#1F4D36]"
            )
      )}
    >
      {label}
    </Link>
  );
}
