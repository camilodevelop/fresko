"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { acceptLegal } from "@/app/actions/consents";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { useFormValidation } from "@/hooks/use-form-validation";
import { notify } from "@/lib/notify";

export function AcceptLegalForm({ next, updated }: { next: string; updated: boolean }) {
  const router = useRouter();
  const [legal, setLegal] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [pending, start] = useTransition();
  const v = useFormValidation(
    () => ({ legal: legal ? null : "Debes aceptar para continuar." }),
    () => ({ legal }),
    "accept"
  );

  return (
    <form
      {...v.formProps(() =>
        start(async () => {
          if (notify(await acceptLegal({ terms: legal, privacy: legal, marketing }))) {
            router.push(next);
            router.refresh();
          }
        })
      )}
      className="space-y-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F4F8F2] text-[#1F4D36]">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1F4D36]">
            {updated ? "Actualizamos nuestros términos" : "Un último paso"}
          </h1>
          <p className="mt-1 text-sm text-[#1B1B1B]/60">
            {updated
              ? "Revisa los cambios y acéptalos para seguir usando FRESKO."
              : "Para usar FRESKO necesitamos que aceptes los términos y autorices el tratamiento de tus datos."}
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl bg-[#F8F7F2] p-4">
        <label className="flex items-start gap-3 text-sm leading-snug text-[#1B1B1B]/75">
          <input
            type="checkbox"
            name="legal"
            id={v.idFor("legal")}
            checked={legal}
            aria-invalid={v.error("legal") ? true : undefined}
            onChange={(e) => {
              setLegal(e.target.checked);
              requestAnimationFrame(v.revalidate);
            }}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#1F4D36]"
          />
          <span>
            Acepto los{" "}
            <Link href="/legal/terminos" target="_blank" className="font-semibold text-[#1F4D36] underline">
              Términos y condiciones
            </Link>{" "}
            y autorizo el tratamiento de mis datos personales según la{" "}
            <Link href="/legal/privacidad" target="_blank" className="font-semibold text-[#1F4D36] underline">
              Política de tratamiento de datos
            </Link>
            .
          </span>
        </label>
        <FieldError name={v.idFor("legal")} error={v.error("legal")} className="mt-0" />
        <label className="flex items-start gap-3 text-sm leading-snug text-[#1B1B1B]/60">
          <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#1F4D36]" />
          <span>Quiero recibir novedades y promociones por correo o WhatsApp (opcional).</span>
        </label>
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "Guardando…" : "Aceptar y continuar"}
      </Button>
    </form>
  );
}
