"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  MapPin,
  Package,
  Repeat,
  Salad,
  UserRound,
} from "lucide-react";
import { readDemoUser } from "@/lib/auth-demo";
import { ACCOUNT_NAV } from "@/lib/data/account";

export default function CuentaHomePage() {
  const [name, setName] = useState("Cliente");

  useEffect(() => {
    try {
      const user = readDemoUser();
      if (user?.name) setName(user.name);
    } catch {
      // mock
    }
  }, []);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8BC34A]">
        Dashboard
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold text-[#1F4D36]">
        Hola, {name}
      </h1>
      <p className="mt-2 max-w-xl text-sm text-[#1B1B1B]/60">
        Desde aquí gestionas pedidos, suscripción y entregas programadas.
        Esta vista es una maqueta temporal.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {ACCOUNT_NAV.filter((item) => item.href !== "/cuenta").map((item) => {
          const Icon =
            {
              "/cuenta/pedidos": Package,
              "/cuenta/suscripcion": Repeat,
              "/cuenta/entregas": CalendarClock,
              "/cuenta/direcciones": MapPin,
              "/cuenta/perfil": UserRound,
            }[item.href] ?? Salad;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-3xl border border-[#1F4D36]/8 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1F4D36]/10 text-[#1F4D36]">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-4 font-display text-lg font-bold text-[#1F4D36]">
                {item.label}
              </h2>
              <p className="mt-1 text-sm text-[#1B1B1B]/55">{item.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
