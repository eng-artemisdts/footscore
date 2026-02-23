import Stripe from "https://esm.sh/stripe@14?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-11-20",
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    return new Response((err as Error).message, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.supabase_user_id;
    if (!userId) {
      const cust = await stripe.customers.retrieve(sub.customer as string);
      if ("metadata" in cust && cust.metadata?.supabase_user_id) {
        const uid = cust.metadata.supabase_user_id;
        const plan = sub.status === "active" || sub.status === "trialing" ? "pro" : "free";
        const status = sub.status === "active" ? "active" : sub.status === "trialing" ? "trialing" : sub.status === "past_due" ? "past_due" : "canceled";
        await supabase
          .from("profiles")
          .update({ plan, subscription_status: status, updated_at: new Date().toISOString() })
          .eq("id", uid);
      }
      return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    const plan = sub.status === "active" || sub.status === "trialing" ? "pro" : "free";
    const status = sub.status === "active" ? "active" : sub.status === "trialing" ? "trialing" : sub.status === "past_due" ? "past_due" : "canceled";
    await supabase
      .from("profiles")
      .update({ plan, subscription_status: status, updated_at: new Date().toISOString() })
      .eq("id", userId);
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.supabase_user_id;
    if (userId) {
      await supabase
        .from("profiles")
        .update({ plan: "free", subscription_status: "canceled", updated_at: new Date().toISOString() })
        .eq("id", userId);
    } else {
      const cust = await stripe.customers.retrieve(sub.customer as string);
      if ("metadata" in cust && cust.metadata?.supabase_user_id) {
        await supabase
          .from("profiles")
          .update({ plan: "free", subscription_status: "canceled", updated_at: new Date().toISOString() })
          .eq("id", cust.metadata.supabase_user_id);
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
});
