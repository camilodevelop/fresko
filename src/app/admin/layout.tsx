import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { adminNavFor } from "@/lib/data/admin-nav";
import { requirePermission } from "@/lib/supabase/auth";
import { getNotifications } from "@/lib/notifications";

export const metadata: Metadata = { title: "Panel | FRESKO" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePermission("admin.access");

  const notifications = await getNotifications(session.userId);

  return (
    <DashboardShell
      notifications={notifications}
      title="Panel"
      homeHref="/admin"
      profileHref="/admin/perfil"
      groups={adminNavFor(session.permissions)}
      user={{
        id: session.userId,
        name: session.fullName,
        email: session.email,
        avatarUrl: session.avatarUrl,
        badge: session.roleNames.join(" · ") || "Personal",
      }}
    >
      {children}
    </DashboardShell>
  );
}
