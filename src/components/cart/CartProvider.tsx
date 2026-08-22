"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const CART_KEY = "fresko_cart";

export type DeliveryMode = "package" | "perItem";

export type CartLine = {
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  details?: string;
  date?: string;
  slotId?: string;
};

export type CartState = {
  lines: CartLine[];
  deliveryMode: DeliveryMode;
  packageDate?: string;
  packageSlotId?: string;
};

const EMPTY: CartState = { lines: [], deliveryMode: "package" };

export type CartAddItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  details?: string;
  unique?: boolean;
};

type CartContextValue = {
  cart: CartState;
  count: number;
  total: number;
  addItem: (item: CartAddItem) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  setDeliveryMode: (mode: DeliveryMode) => void;
  setPackageDelivery: (date?: string, slotId?: string) => void;
  setLineDelivery: (productId: string, date?: string, slotId?: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function loadCart(): CartState {
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as CartState;
    if (!Array.isArray(parsed.lines)) return EMPTY;
    return {
      lines: parsed.lines,
      deliveryMode: parsed.deliveryMode === "perItem" ? "perItem" : "package",
      packageDate: parsed.packageDate,
      packageSlotId: parsed.packageSlotId,
    };
  } catch {
    return EMPTY;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartState>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCart(loadCart());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, ready]);

  const addItem = useCallback((item: CartAddItem) => {
    setCart((prev) => {
      const productId = item.unique
        ? `${item.id}-${Date.now()}`
        : item.id;

      if (!item.unique) {
        const existing = prev.lines.find((line) => line.productId === productId);
        if (existing) {
          return {
            ...prev,
            lines: prev.lines.map((line) =>
              line.productId === productId
                ? { ...line, quantity: line.quantity + 1 }
                : line
            ),
          };
        }
      }

      return {
        ...prev,
        lines: [
          ...prev.lines,
          {
            productId,
            name: item.name,
            price: item.price,
            image: item.image,
            quantity: 1,
            details: item.details,
          },
        ],
      };
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setCart((prev) => ({
      ...prev,
      lines:
        quantity < 1
          ? prev.lines.filter((line) => line.productId !== productId)
          : prev.lines.map((line) =>
              line.productId === productId ? { ...line, quantity } : line
            ),
    }));
  }, []);

  const removeItem = useCallback((productId: string) => {
    setCart((prev) => ({
      ...prev,
      lines: prev.lines.filter((line) => line.productId !== productId),
    }));
  }, []);

  const setDeliveryMode = useCallback((mode: DeliveryMode) => {
    setCart((prev) => ({ ...prev, deliveryMode: mode }));
  }, []);

  const setPackageDelivery = useCallback((date?: string, slotId?: string) => {
    setCart((prev) => ({
      ...prev,
      packageDate: date ?? prev.packageDate,
      packageSlotId: slotId ?? prev.packageSlotId,
    }));
  }, []);

  const setLineDelivery = useCallback(
    (productId: string, date?: string, slotId?: string) => {
      setCart((prev) => ({
        ...prev,
        lines: prev.lines.map((line) =>
          line.productId === productId
            ? {
                ...line,
                date: date ?? line.date,
                slotId: slotId ?? line.slotId,
              }
            : line
        ),
      }));
    },
    []
  );

  const clear = useCallback(() => setCart(EMPTY), []);

  const count = useMemo(
    () => cart.lines.reduce((sum, line) => sum + line.quantity, 0),
    [cart.lines]
  );
  const total = useMemo(
    () => cart.lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [cart.lines]
  );

  const value = useMemo(
    () => ({
      cart,
      count,
      total,
      addItem,
      setQuantity,
      removeItem,
      setDeliveryMode,
      setPackageDelivery,
      setLineDelivery,
      clear,
    }),
    [
      cart,
      count,
      total,
      addItem,
      setQuantity,
      removeItem,
      setDeliveryMode,
      setPackageDelivery,
      setLineDelivery,
      clear,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
