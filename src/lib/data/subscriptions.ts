export type SubscriptionCategory = "ensaladas" | "bowls";

export const AVG_SALAD_PRICE = 9900;
export const AVG_BOWL_PRICE = 19900;

/** Full queda al precio promedio. Los demás se calculan sobre el precio de lista (Full = 20% off). */
const DISCOUNT_BY_SERVINGS: Record<number, number> = {
  12: 0.05,
  20: 0.12,
  28: 0.2,
};

export type SubscriptionPlan = {
  id: string;
  category: SubscriptionCategory;
  name: string;
  servingsPerMonth: number;
  servingLabel: "ensaladas" | "bowls";
  price: number;
  listPrice: number;
  savings: number;
  discountPercent: number;
  pricePerServing: number;
  popular?: boolean;
  benefits: string[];
};

function pricedPlan(
  fullUnitPrice: number,
  servingsPerMonth: number
): Pick<
  SubscriptionPlan,
  "price" | "listPrice" | "savings" | "discountPercent" | "pricePerServing"
> {
  const discountPercent = DISCOUNT_BY_SERVINGS[servingsPerMonth] ?? 0;
  const listUnit = fullUnitPrice / (1 - DISCOUNT_BY_SERVINGS[28]);
  const unitPrice =
    servingsPerMonth === 28
      ? fullUnitPrice
      : listUnit * (1 - discountPercent);
  const listPrice = Math.round((servingsPerMonth * listUnit) / 100) * 100;
  const price =
    servingsPerMonth === 28
      ? servingsPerMonth * fullUnitPrice
      : Math.round((servingsPerMonth * unitPrice) / 100) * 100;

  return {
    listPrice,
    price,
    savings: listPrice - price,
    discountPercent: Math.round(discountPercent * 100),
    pricePerServing:
      servingsPerMonth === 28
        ? fullUnitPrice
        : Math.round(price / servingsPerMonth),
  };
}

export const SUBSCRIPTION_TABS: {
  id: SubscriptionCategory;
  label: string;
}[] = [
  { id: "ensaladas", label: "Ensaladas" },
  { id: "bowls", label: "Bowls" },
];

function saladPlan(
  id: string,
  name: string,
  servingsPerMonth: number,
  popular?: boolean,
  extraBenefits: string[] = []
): SubscriptionPlan {
  return {
    id,
    category: "ensaladas",
    name,
    servingsPerMonth,
    servingLabel: "ensaladas",
    ...pricedPlan(AVG_SALAD_PRICE, servingsPerMonth),
    popular,
    benefits: [
      "Entrega programada",
      "Menú variado",
      "Pausa cuando quieras",
      ...extraBenefits,
    ],
  };
}

function bowlPlan(
  id: string,
  name: string,
  servingsPerMonth: number,
  popular?: boolean,
  extraBenefits: string[] = []
): SubscriptionPlan {
  return {
    id,
    category: "bowls",
    name,
    servingsPerMonth,
    servingLabel: "bowls",
    ...pricedPlan(AVG_BOWL_PRICE, servingsPerMonth),
    popular,
    benefits: [
      "Entrega programada",
      "Menú variado",
      "Pausa cuando quieras",
      ...extraBenefits,
    ],
  };
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  saladPlan("ensalada-basic", "Plan Basic", 12, false, ["5% de descuento"]),
  saladPlan("ensalada-smart", "Plan Smart", 20, true, [
    "Entrega gratis",
    "12% de descuento",
  ]),
  saladPlan("ensalada-full", "Plan Full", 28, false, [
    "Entrega diaria",
    "20% de descuento",
    "Arma tu ensalada",
  ]),
  bowlPlan("bowl-basic", "Plan Basic", 12, false, ["5% de descuento"]),
  bowlPlan("bowl-smart", "Plan Smart", 20, true, [
    "Entrega gratis",
    "12% de descuento",
  ]),
  bowlPlan("bowl-full", "Plan Full", 28, false, [
    "Entrega diaria",
    "20% de descuento",
    "Arma tu bowl",
  ]),
];
