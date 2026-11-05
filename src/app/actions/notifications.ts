"use server";

import { requireSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationRead(id: string) {
  const session = await requireSession();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", session.userId)
    .is("read_at", null);
}

export async function markAllNotificationsRead() {
  const session = await requireSession();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", session.userId)
    .is("read_at", null);
}
