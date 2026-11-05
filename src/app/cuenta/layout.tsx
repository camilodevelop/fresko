import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { ACCOUNT_NAV_GROUPS } from "@/lib/data/account";
import { requireSession } from "@/lib/supabase/auth";
import { getNotifications } from "@/lib/notifications";

export const metadata: Metadata = {
  title: "Mi cuenta | FRESKO",
};

export default async function CuentaLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession("/cuenta");
  // El personal no es cliente: va directo a su panel.
  if (session.isStaff) redirect("/admin");

  const notifications = await getNotifications(session.userId);

  return (
    <DashboardShell
      notifications={notifications}
      title="Mi cuenta"
      homeHref="/cuenta"
      profileHref="/cuenta/perfil"
      groups={ACCOUNT_NAV_GROUPS}
      user={{
        id: session.userId,
        name: session.fullName,
        email: session.email,
        avatarUrl: session.avatarUrl,
        badge: "Cliente",
      }}
    >
      {children}
    </DashboardShell>
  );
}
