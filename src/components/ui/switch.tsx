"use client";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  disabled,
  onChange,
  label,
  size = "md",
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8BC34A]/60 disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-5 w-9" : "h-6 w-11",
        checked ? "bg-[#1F4D36]" : "bg-[#1B1B1B]/15"
      )}
    >
      <span
        className={cn(
          "inline-block rounded-full bg-white shadow transition-transform",
          size === "sm" ? "h-4 w-4" : "h-5 w-5",
          checked ? (size === "sm" ? "translate-x-[18px]" : "translate-x-[22px]") : "translate-x-0.5"
        )}
      />
    </button>
  );
}
