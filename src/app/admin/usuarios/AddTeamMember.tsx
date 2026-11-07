"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Panel } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/notify";
import { addTeamMember } from "./actions";

/** Agregar al equipo por correo: la persona primero se registra en la página como cliente. */
export function AddTeamMember({ roles, kitchens }: { roles: { id: string; name: string }[]; kitchens: { id: string; name: string }[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(roles[0]?.id ?? "");
  const [kitchen, setKitchen] = useState(kitchens[0]?.id ?? "");
  const [busy, start] = useTransition();
  const select = "h-11 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-3 text-sm";
  return (
    <Panel icon={UserPlus} title="Agregar al equipo" description="La persona primero crea su cuenta en la página; luego escribe aquí su correo.">
      <form
        className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_170px_170px_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await addTeamMember(email, role, kitchen);
            if (notify(r) && r.ok) {
              setEmail("");
              router.refresh();
            }
          });
        }}
      >
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@ejemplo.com" className="h-11" aria-label="Correo" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className={select} aria-label="Rol">
          {roles.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <select value={kitchen} onChange={(e) => setKitchen(e.target.value)} className={select} aria-label="Cocina">
          {kitchens.map((k) => (
            <option key={k.id} value={k.id}>{k.name}</option>
          ))}
        </select>
        <Button type="submit" disabled={busy || !email}>
          {busy ? "Agregando…" : "Agregar"}
        </Button>
      </form>
    </Panel>
  );
}
