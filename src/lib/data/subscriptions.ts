export type SubscriptionPlan = {
  id: string;
  name: string;
  bowlsPerWeek: number;
  price: number;
  savings: number;
  pricePerBowl: number;
  popular?: boolean;
  benefits: string[];
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "basic",
    name: "Plan Basic",
    bowlsPerWeek: 3,
    price: 85000,
    savings: 12000,
    pricePerBowl: 28333,
    benefits: ["Entrega programada", "Menú variado", "Pausa cuando quieras"],
  },
  {
    id: "smart",
    name: "Plan Smart",
    bowlsPerWeek: 5,
    price: 135000,
    savings: 25000,
    pricePerBowl: 27000,
    popular: true,
    benefits: [
      "Entrega gratis",
      "Prioridad en pedidos",
      "Descuentos exclusivos",
      "Pausa o cancela",
    ],
  },
  {
    id: "full",
    name: "Plan Full",
    bowlsPerWeek: 7,
    price: 175000,
    savings: 42000,
    pricePerBowl: 25000,
    benefits: [
      "Entrega diaria",
      "Arma tu bowl ilimitado",
      "Soporte prioritario",
      "Snacks saludables",
    ],
  },
];
