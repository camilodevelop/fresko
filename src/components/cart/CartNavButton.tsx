"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { cn } from "@/lib/utils";

export function CartNavButton({ className }: { className?: string }) {
  const { count } = useCart();

  return (
    <Link
      href="/carrito"
      className={cn(
        "relative z-[60] inline-flex h-10 w-10 items-center justify-center rounded-full text-[#1F4D36] transition-all hover:bg-[#1F4D36]/8",
        className
      )}
      aria-label={`Carrito${count ? `, ${count} productos` : ""}`}
    >
      <ShoppingBag className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#8BC34A] px-1 text-[10px] font-bold text-[#1F4D36]">
          {count}
        </span>
      )}
    </Link>
  );
}
