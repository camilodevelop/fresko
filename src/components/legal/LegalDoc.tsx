import Link from "next/link";
import { FileText } from "lucide-react";
import { COMPANY, LEGAL_DOCS, formatLegalDate, isPending } from "@/lib/legal";
import { cn } from "@/lib/utils";

/** Valor de la empresa; si falta completarlo, se resalta para que no pase desapercibido. */
export function Co({ field }: { field: keyof typeof COMPANY }) {
  const value = COMPANY[field];
  if (isPending(value)) {
    return <mark className="rounded bg-amber-100 px-1 text-amber-900">[{value}]</mark>;
  }
  return <>{value}</>;
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="font-display text-xl font-bold text-[#1F4D36]">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-[#1B1B1B]/75 [&_li]:pl-1 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5 [&_strong]:font-semibold [&_strong]:text-[#1B1B1B]/90 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

export function LegalDoc({
  current,
  title,
  intro,
  version,
  sections,
  children,
}: {
  current: string;
  title: string;
  intro: React.ReactNode;
  version: string;
  sections: { id: string; title: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1B1B1B]/40">Información legal</p>
          <nav className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible" aria-label="Documentos legales">
            {LEGAL_DOCS.map((doc) => (
              <Link
                key={doc.href}
                href={doc.href}
                aria-current={doc.href === current ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  doc.href === current ? "bg-[#1F4D36] text-white" : "text-[#1B1B1B]/65 hover:bg-white hover:text-[#1F4D36]"
                )}
              >
                <FileText className="h-4 w-4 shrink-0 opacity-70" />
                {doc.short}
              </Link>
            ))}
          </nav>
          <div className="mt-6 hidden rounded-2xl bg-white p-4 text-sm ring-1 ring-[#1F4D36]/[0.07] lg:block">
            <p className="font-semibold text-[#1F4D36]">En este documento</p>
            <ol className="mt-2 space-y-1.5 text-[13px]">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-[#1B1B1B]/55 hover:text-[#1F4D36]">
                    {i + 1}. {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </aside>

        <article className="rounded-[28px] bg-white px-6 py-8 ring-1 ring-[#1F4D36]/[0.07] sm:px-10 sm:py-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7CB342]">{COMPANY.brand}</p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-[#1F4D36] sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-[#1B1B1B]/45">
            Versión vigente desde el {formatLegalDate(version)}
          </p>
          <div className="mt-6 text-[15px] leading-relaxed text-[#1B1B1B]/75">{intro}</div>
          <div className="mt-10 space-y-10">{children}</div>
        </article>
      </div>
    </div>
  );
}
