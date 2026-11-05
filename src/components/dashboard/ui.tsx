import Link from "next/link";
import { ChevronLeft, Info, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Encabezado estándar de cada pantalla del panel / mi cuenta. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  back,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-8">
      {back && (
        <Link
          href={back.href}
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-[#1F4D36]/55 transition-colors hover:text-[#1F4D36] lg:hidden"
        >
          <ChevronLeft className="h-4 w-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7CB342]">{eyebrow}</p>
          )}
          <h1 className="mt-1 font-display text-[28px] font-bold leading-tight text-[#1F4D36] sm:text-3xl">
            {title}
          </h1>
          {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#1B1B1B]/55">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Tarjeta contenedora con encabezado opcional. */
export function Panel({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-[#1F4D36]/[0.07] bg-white shadow-[0_1px_2px_rgba(31,77,54,0.04)]",
        className
      )}
    >
      {(title || actions) && (
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div className="flex min-w-0 items-start gap-3">
            {Icon && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F4F8F2] text-[#1F4D36]">
                <Icon className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0">
              {title && <h2 className="font-display text-base font-bold text-[#1F4D36]">{title}</h2>}
              {description && <p className="mt-0.5 text-sm text-[#1B1B1B]/50">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn("p-6", (title || actions) && "pt-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Indicador numérico. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: LucideIcon;
  tone?: "default" | "fresh" | "dark";
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border p-5",
        tone === "dark"
          ? "border-transparent bg-[#1F4D36] text-white"
          : tone === "fresh"
            ? "border-transparent bg-[#E8F3DC]"
            : "border-[#1F4D36]/[0.07] bg-white"
      )}
    >
      <div className="flex items-center justify-between">
        <p className={cn("text-xs font-semibold", tone === "dark" ? "text-white/65" : "text-[#1B1B1B]/50")}>
          {label}
        </p>
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-xl",
            tone === "dark" ? "bg-white/10 text-[#C5E1A5]" : "bg-[#F4F8F2] text-[#1F4D36]"
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p
        className={cn(
          "mt-3 font-display text-2xl font-bold tracking-tight",
          tone === "dark" ? "text-white" : "text-[#1F4D36]"
        )}
      >
        {value}
      </p>
      {hint && (
        <p className={cn("mt-1 text-xs", tone === "dark" ? "text-white/60" : "text-[#1B1B1B]/45")}>{hint}</p>
      )}
    </div>
  );
}

const STATUS_TONES = {
  green: "bg-[#E8F3DC] text-[#2E6B1F]",
  blue: "bg-sky-50 text-sky-800",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-700",
  gray: "bg-[#1B1B1B]/[0.05] text-[#1B1B1B]/55",
  dark: "bg-[#1F4D36] text-white",
} as const;

export type StatusTone = keyof typeof STATUS_TONES;

export function StatusBadge({
  tone = "gray",
  children,
  dot = true,
  className,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
        STATUS_TONES[tone],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />}
      {children}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-[#1F4D36]/15 bg-white/60 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4F8F2] text-[#1F4D36]">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-4 font-display font-bold text-[#1F4D36]">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-[#1B1B1B]/50">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Aviso de que la pantalla muestra datos de ejemplo hasta su fase. */
export function PreviewNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

export const fieldLabelClass = "block text-xs font-semibold text-[#1B1B1B]/60";
