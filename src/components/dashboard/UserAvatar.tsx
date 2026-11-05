import { cn } from "@/lib/utils";

export function initials(name: string, email?: string | null) {
  const source = name.trim() || email || "?";
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function UserAvatar({
  name,
  email,
  src,
  size = 40,
  className,
}: {
  name: string;
  email?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#C5E1A5] font-display font-bold text-[#1F4D36]",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL pública de Supabase Storage
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(name, email)
      )}
    </span>
  );
}
