import { cookies } from "next/headers";
import type { NotificationItem } from "@/lib/notifications";
import { DashboardFrame } from "./DashboardFrame";
import { NotificationsProvider } from "./Notifications";
import type { SidebarUser } from "./Sidebar";
import { SIDEBAR_COOKIE, type NavGroup } from "./types";

export async function DashboardShell({
  title,
  homeHref,
  profileHref,
  groups,
  user,
  notifications,
  children,
}: {
  title: string;
  homeHref: string;
  profileHref: string;
  groups: NavGroup[];
  user: SidebarUser & { id: string };
  notifications: NotificationItem[];
  children: React.ReactNode;
}) {
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "collapsed";

  return (
    <NotificationsProvider userId={user.id} initial={notifications} profileHref={profileHref}>
      <div className="min-h-screen bg-[#F8F7F2]">
        <DashboardFrame
          title={title}
          homeHref={homeHref}
          profileHref={profileHref}
          groups={groups}
          user={user}
          initialCollapsed={collapsed}
        >
          {children}
        </DashboardFrame>
      </div>
    </NotificationsProvider>
  );
}
