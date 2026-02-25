import { Plan, SubscriptionStatus, User } from "@/shared/types";

const defaultPlan: Plan = "free";
const defaultSubscriptionStatus: SubscriptionStatus = "free";

export function supabaseUserToAppUser(
  supabaseUser: {
    id: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      name?: string;
      given_name?: string;
      family_name?: string;
      avatar_url?: string;
      picture?: string;
      avatarUrl?: string;
      photo_url?: string;
    };
  },
  profile?: {
    plan: Plan;
    subscription_status: SubscriptionStatus;
    stripe_customer_id?: string | null;
  } | null,
): User {
  const meta = supabaseUser.user_metadata ?? {};
  const avatarUrl = (
    meta.avatar_url ||
    meta.picture ||
    meta.avatarUrl ||
    meta.photo_url ||
    ""
  ).trim();
  const full =
    meta.full_name ||
    meta.name ||
    [meta.given_name, meta.family_name].filter(Boolean).join(" ").trim();
  const fromEmail = (supabaseUser.email?.split("@")[0] ?? "").trim();
  const fromEmailDisplay = fromEmail
    ? fromEmail[0].toUpperCase() + fromEmail.slice(1).toLowerCase()
    : "";
  const raw = (full || fromEmailDisplay || "Usuário").trim();
  const isProviderName = /^google$/i.test(raw);
  const name = isProviderName ? fromEmailDisplay || "Usuário" : raw || "Usuário";
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? "",
    name,
    avatarUrl: avatarUrl || null,
    role: "ADMIN",
    plan: profile?.plan ?? defaultPlan,
    subscriptionStatus: profile?.subscription_status ?? defaultSubscriptionStatus,
    stripeCustomerId: profile?.stripe_customer_id ?? null,
  };
}

