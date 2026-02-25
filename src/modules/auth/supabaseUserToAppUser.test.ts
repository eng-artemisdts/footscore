import { supabaseUserToAppUser } from "@/modules/auth/supabaseUserToAppUser";

describe("modules/auth/supabaseUserToAppUser", () => {
  it("prioriza full_name do metadata", () => {
    const user = supabaseUserToAppUser(
      { id: "u1", email: "joao@email.com", user_metadata: { full_name: "João Silva" } },
      null,
    );
    expect(user.name).toBe("João Silva");
    expect(user.plan).toBe("free");
    expect(user.subscriptionStatus).toBe("free");
  });

  it("monta nome a partir de given_name e family_name", () => {
    const user = supabaseUserToAppUser(
      { id: "u1", email: "maria@email.com", user_metadata: { given_name: "Maria", family_name: "Souza" } },
      null,
    );
    expect(user.name).toBe("Maria Souza");
  });

  it("usa fallback do email quando metadata é google", () => {
    const user = supabaseUserToAppUser(
      { id: "u1", email: "teste@email.com", user_metadata: { name: "google" } },
      null,
    );
    expect(user.name).toBe("Teste");
  });

  it("aplica dados de profile quando informado", () => {
    const user = supabaseUserToAppUser(
      { id: "u1", email: "ana@email.com" },
      { plan: "pro", subscription_status: "active", stripe_customer_id: "cus_123" },
    );
    expect(user.plan).toBe("pro");
    expect(user.subscriptionStatus).toBe("active");
    expect(user.stripeCustomerId).toBe("cus_123");
  });
});

