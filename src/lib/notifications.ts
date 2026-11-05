import "server-only";
import { createClient } from "@/lib/supabase/server";

export type NotificationItem = {
  id: string;
  kind: "info" | "success" | "warning" | "alert";
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
};

export async function getNotifications(userId: string): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, title, body, href, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as NotificationItem[];
}
