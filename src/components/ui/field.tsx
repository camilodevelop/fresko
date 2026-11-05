import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Etiqueta + control + ayuda/error, con el mismo formato en todos los formularios. */
export function Field({
  label,
  name,
  error,
  hint,
  children,
  className,
  optional,
}: {
  label?: React.ReactNode;
  name?: string;
  error?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  optional?: boolean;
}) {
  return (
    <div className={cn("block", className)}>
      {label && (
        <label htmlFor={name} className="mb-1.5 flex items-baseline gap-1.5 text-xs font-semibold text-[#1B1B1B]/60">
          {label}
          {optional && <span className="font-normal text-[#1B1B1B]/35">(opcional)</span>}
        </label>
      )}
      {children}
      <FieldError name={name} error={error} />
      {!error && hint && <p className="mt-1.5 text-xs leading-snug text-[#1B1B1B]/45">{hint}</p>}
    </div>
  );
}

export function FieldError({ name, error, className }: { name?: string; error?: string; className?: string }) {
  if (!error) return null;
  return (
    <p id={name ? `${name}-error` : undefined} role="alert" className={cn("mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-600", className)}>
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
      {error}
    </p>
  );
}
