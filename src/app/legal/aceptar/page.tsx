import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AcceptLegalForm } from "@/components/legal/AcceptLegalForm";
import { loadMyConsents } from "@/lib/consents";
import { safeNext } from "@/lib/safe-next";
import { requireSession } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Aceptar términos | FRESKO" };

export default async function AceptarPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: raw } = await searchParams;
  const next = safeNext(raw);
  const session = await requireSession(`/legal/aceptar?next=${encodeURIComponent(next)}`);
  if (!session.needsConsent) redirect(next);
  // Si ya había aceptado una versión anterior, es una actualización.
  const updated = (await loadMyConsents(session.userId)).has("terminos");

  return (
    <div className="mx-auto max-w-lg px-4">
      <div className="rounded-[28px] bg-white p-6 ring-1 ring-[#1F4D36]/[0.07] sm:p-8">
        <AcceptLegalForm next={next} updated={updated} />
      </div>
    </div>
  );
}
