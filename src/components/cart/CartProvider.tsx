"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

const CART_KEY = "fresko_cart_v2";

export type CartLine = {
  /** Clave única de la línea (slug, o slug + id para productos armados). */
  key: string;
  slug: string;
  name: string;
  /** Precio mostrado; el definitivo lo calcula el servidor al crear el pedido. */
  price: number;
  image: string;
  quantity: number;
  /** Resumen legible de lo armado ("Lechuga, Pollo, Limón"). */
  details?: string;
  /** ids de opciones del armador. */
  options?: string[];
};

export type CartAddItem = {
  id: string; // slug del producto
  name: string;
  price: number;
  image: string;
  details?: string;
  options?: string[];
  /** Cada armado es una línea distinta. */
  unique?: boolean;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  total: number;
  ready: boolean;
  addItem: (item: CartAddItem) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

// Almacén en localStorage compartido entre pestañas.
const listeners = new Set<() => void>();
let cache: { raw: string | null; lines: CartLine[] } = { raw: null, lines: [] };

function read(): CartLine[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(CART_KEY);
  if (raw === cache.raw) return cache.lines;
  let lines: CartLine[] = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      lines = parsed.filter((l) => l && typeof l.slug === "string" && l.quantity > 0);
    }
  } catch {
    lines = [];
  }
  cache = { raw, lines };
  return lines;
}

function write(lines: CartLine[]) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(lines));
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === CART_KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const EMPTY: CartLine[] = [];

export function CartProvider({ children }: { children: React.ReactNode }) {
  const lines = useSyncExternalStore(subscribe, read, () => EMPTY);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);

  const addItem = useCallback((item: CartAddItem) => {
    const current = read();
    const key = item.unique ? `${item.id}-${Date.now().toString(36)}` : item.id;
    const existing = !item.unique && current.find((l) => l.key === key);
    write(
      existing
        ? current.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, l.quantity + 1) } : l))
        : [
            ...current,
            {
              key,
              slug: item.id,
              name: item.name,
              price: item.price,
              image: item.image,
              quantity: 1,
              details: item.details,
              options: item.options,
            },
          ]
    );
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    const current = read();
    write(
      quantity < 1
        ? current.filter((l) => l.key !== key)
        : current.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, quantity) } : l))
    );
  }, []);

  const removeItem = useCallback((key: string) => write(read().filter((l) => l.key !== key)), []);
  const clear = useCallback(() => write([]), []);

  const value = useMemo(
    () => ({
      lines,
      ready,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      total: lines.reduce((s, l) => s + l.price * l.quantity, 0),
      addItem,
      setQuantity,
      removeItem,
      clear,
    }),
    [lines, ready, addItem, setQuantity, removeItem, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
