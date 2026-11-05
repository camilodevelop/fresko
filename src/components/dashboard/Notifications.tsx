"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, BellOff, CheckCheck, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notifications";
import { toast } from "@/lib/notify";
import { createClient } from "@/lib/supabase/client";
import type { NotificationItem } from "@/lib/notifications";
import { cn } from "@/lib/utils";

type Ctx = {
  items: NotificationItem[];
  unread: number;
  open: (item: NotificationItem) => void;
  readAll: () => void;
};

const NotificationsContext = createContext<Ctx | null>(null);

/** Estado compartido de notificaciones + suscripción en tiempo real. */
export function NotificationsProvider({
  userId,
  initial,
  profileHref,
  children,
}: {
  userId: string;
  initial: NotificationItem[];
  profileHref: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    // El canal debe autenticarse con el token del usuario; si no, RLS oculta sus filas.
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => {
            const item = payload.new as NotificationItem;
            setItems((prev) => (prev.some((n) => n.id === item.id) ? prev : [item, ...prev].slice(0, 20)));
            const show = item.kind === "alert" ? toast.error : item.kind === "warning" ? toast.warning : item.kind === "success" ? toast.success : toast.info;
            show(item.title, { description: item.body || undefined });
          }
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId]);

  const value = useMemo<Ctx>(() => {
    const now = new Date().toISOString();
    return {
      items,
      unread: items.filter((n) => !n.read_at).length,
      open: (item) => {
        if (!item.read_at) {
          setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read_at: now } : n)));
          startTransition(() => markNotificationRead(item.id));
        }
        if (item.href) {
          // La bienvenida apunta al perfil de cliente; el personal tiene el suyo en el panel.
          router.push(item.href === "/cuenta/perfil" ? profileHref : item.href);
        }
      },
      readAll: () => {
        setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
        startTransition(async () => {
          await markAllNotificationsRead();
          toast.success("Notificaciones marcadas como leídas.");
        });
      },
    };
  }, [items, router, profileHref]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

const KIND = {
  info: { icon: Info, className: "bg-sky-50 text-sky-700" },
  success: { icon: CheckCircle2, className: "bg-[#E8F3DC] text-[#2E6B1F]" },
  warning: { icon: AlertTriangle, className: "bg-amber-50 text-amber-700" },
  alert: { icon: OctagonAlert, className: "bg-red-50 text-red-700" },
} as const;

function timeAgo(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
  if (seconds < 60) return "ahora";
  if (seconds < 3600) return rtf.format(-Math.round(seconds / 60), "minute");
  if (seconds < 86400) return rtf.format(-Math.round(seconds / 3600), "hour");
  return rtf.format(-Math.round(seconds / 86400), "day");
}

export function NotificationBell({ align = "right" }: { align?: "right" | "left" }) {
  const ctx = useContext(NotificationsContext);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!ctx) return null;
  const { items, unread, readAll } = ctx;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `Notificaciones, ${unread} sin leer` : "Notificaciones"}
        aria-expanded={open}
        className={cn(
          "relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[#1F4D36] transition-colors hover:bg-[#F4F8F2]",
          open && "bg-[#F4F8F2]"
        )}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E53935] px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={cn(
            "absolute top-12 z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-white shadow-2xl shadow-[#1F4D36]/15 ring-1 ring-[#1F4D36]/[0.08]",
            // En móvil ocupa el ancho de la pantalla para no cortarse.
            "max-sm:fixed max-sm:inset-x-3 max-sm:top-16 max-sm:w-auto",
            align === "right" ? "sm:right-0" : "sm:left-0"
          )}
        >
          <div className="flex items-center justify-between border-b border-[#1F4D36]/[0.06] px-4 py-3">
            <p className="font-display font-bold text-[#1F4D36]">
              Notificaciones
              {unread > 0 && (
                <span className="ml-2 rounded-full bg-[#E8F3DC] px-2 py-0.5 text-[11px] font-semibold text-[#1F4D36]">
                  {unread} nuevas
                </span>
              )}
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={readAll}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#1F4D36]/70 hover:bg-[#F4F8F2] hover:text-[#1F4D36]"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Marcar todas
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <BellOff className="h-6 w-6 text-[#1B1B1B]/25" />
              <p className="mt-2 text-sm text-[#1B1B1B]/50">No tienes notificaciones.</p>
            </div>
          ) : (
            <ul className="max-h-[min(420px,calc(100dvh-10rem))] overflow-y-auto overscroll-contain py-1">
              {items.map((n) => {
                const kind = KIND[n.kind] ?? KIND.info;
                const Icon = kind.icon;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        ctx.open(n);
                        if (n.href) setOpen(false);
                      }}
                      className={cn(
                        "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F8F7F2]",
                        !n.read_at && "bg-[#F4F8F2]/60"
                      )}
                    >
                      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", kind.className)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className={cn("text-sm text-[#1F4D36]", !n.read_at ? "font-bold" : "font-medium")}>
                            {n.title}
                          </span>
                          {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#8BC34A]" />}
                        </span>
                        {n.body && <span className="mt-0.5 block text-xs leading-relaxed text-[#1B1B1B]/55">{n.body}</span>}
                        <span className="mt-1 block text-[11px] text-[#1B1B1B]/35">{timeAgo(n.created_at)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
