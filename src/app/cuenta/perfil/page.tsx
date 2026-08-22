"use client";

import { useEffect, useState } from "react";
import { formatPhoneDisplay, readDemoUser, type DemoUser } from "@/lib/auth-demo";

export default function PerfilPage() {
  const [user, setUser] = useState<DemoUser | null>(null);

  useEffect(() => {
    setUser(readDemoUser());
  }, []);

  return (
    <section>
      <h1 className="font-display text-3xl font-bold text-[#1F4D36]">Mi perfil</h1>
      <p className="mt-2 text-sm text-[#1B1B1B]/60">
        Tu cuenta es el celular o el correo. El teléfono se valida con OTP al registrarte.
      </p>
      <div className="mt-6 max-w-md space-y-3 rounded-3xl bg-white p-6">
        <p className="text-sm text-[#1B1B1B]/70">
          <span className="font-semibold text-[#1F4D36]">Nombre: </span>
          {user?.name || "—"}
        </p>
        <p className="text-sm text-[#1B1B1B]/70">
          <span className="font-semibold text-[#1F4D36]">Celular: </span>
          {user?.phone ? formatPhoneDisplay(user.phone) : "—"}
          {user?.phoneVerified ? " · verificado" : ""}
        </p>
        <p className="text-sm text-[#1B1B1B]/70">
          <span className="font-semibold text-[#1F4D36]">Correo: </span>
          {user?.email || "—"}
        </p>
      </div>
    </section>
  );
}
