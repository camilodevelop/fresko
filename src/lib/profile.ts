import "server-only";
import { requireSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { ProfileData } from "@/components/profile/ProfileSettings";

export async function loadProfile(next: string): Promise<ProfileData> {
  const session = await requireSession(next);
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("full_name, phone, avatar_url")
    .eq("id", session.userId)
    .single();
  return {
    userId: session.userId,
    fullName: data?.full_name ?? "",
    phone: data?.phone ?? "",
    email: session.email ?? "",
    avatarUrl: data?.avatar_url ?? null,
    hasPassword: session.hasPassword,
  };
}
