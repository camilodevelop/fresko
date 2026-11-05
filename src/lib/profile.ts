import "server-only";
import { requireSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { ProfileData } from "@/components/profile/ProfileSettings";
import { loadMyConsents } from "@/lib/consents";

export async function loadProfile(next: string): Promise<ProfileData> {
  const session = await requireSession(next);
  const supabase = await createClient();
  const [{ data }, consents] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, avatar_url, marketing_opt_in").eq("id", session.userId).single(),
    loadMyConsents(session.userId),
  ]);
  return {
    userId: session.userId,
    fullName: data?.full_name ?? "",
    phone: data?.phone ?? "",
    email: session.email ?? "",
    avatarUrl: data?.avatar_url ?? null,
    hasPassword: session.hasPassword,
    marketing: data?.marketing_opt_in ?? false,
    consents: ["terminos", "privacidad"].map((doc) => {
      const c = consents.get(doc);
      return { document: doc, version: c?.version ?? null, date: c?.created_at ?? null };
    }),
  };
}
