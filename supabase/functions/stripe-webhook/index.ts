// Supabase Edge Function: stripe-webhook
// Handles Stripe webhook events to sync subscription state to Supabase profiles.

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Map price IDs → plan name
function planFromPriceId(priceId: string): "starter" | "premium" | "team" | null {
  const starterMonthly = Deno.env.get("STRIPE_STARTER_MONTHLY_PRICE_ID");
  const starterYearly  = Deno.env.get("STRIPE_STARTER_YEARLY_PRICE_ID");
  const proMonthly     = Deno.env.get("STRIPE_PRO_MONTHLY_PRICE_ID");
  const proYearly      = Deno.env.get("STRIPE_PRO_YEARLY_PRICE_ID");
  const teamMonthly    = Deno.env.get("STRIPE_TEAM_MONTHLY_PRICE_ID");
  const teamYearly     = Deno.env.get("STRIPE_TEAM_YEARLY_PRICE_ID");

  // Fallback: also match the old monthly/yearly price IDs as pro
  const oldMonthly = Deno.env.get("STRIPE_MONTHLY_PRICE_ID");
  const oldYearly  = Deno.env.get("STRIPE_YEARLY_PRICE_ID");

  if (priceId === starterMonthly || priceId === starterYearly) return "starter";
  if (priceId === proMonthly     || priceId === proYearly)     return "premium";
  if (priceId === teamMonthly    || priceId === teamYearly)    return "team";
  if (priceId === oldMonthly     || priceId === oldYearly)     return "premium";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const stripeKey     = Deno.env.get("STRIPE_SECRET_KEY")!;
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
  const signature     = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${err}`, { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId         = session.metadata?.supabase_user_id ?? session.client_reference_id;
        const customerId     = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId) {
          console.warn("No user ID in session metadata or client_reference_id");
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        const priceId = subscription.items.data[0]?.price.id ?? "";
        const plan = planFromPriceId(priceId) ?? "premium";

        await admin.from("profiles").update({
          plan,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: subscription.status,
          current_period_end: periodEnd,
        }).eq("id", userId);

        console.log(`User ${userId} subscribed to ${plan} (price: ${priceId})`);
        break;
      }

      case "customer.subscription.updated": {
        const sub        = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const periodEnd  = new Date(sub.current_period_end * 1000).toISOString();
        const priceId    = sub.items.data[0]?.price.id ?? "";
        const activePlan = planFromPriceId(priceId) ?? "premium";
        const plan       = sub.status === "active" ? activePlan : "free";

        const { data: profile } = await admin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          await admin.from("profiles").update({
            plan,
            subscription_status: sub.status,
            current_period_end: periodEnd,
            stripe_subscription_id: sub.id,
          }).eq("id", profile.id);

          console.log(`Subscription updated for customer ${customerId}: ${plan} (${sub.status})`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub        = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const { data: profile } = await admin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (profile) {
          await admin.from("profiles").update({
            plan: "free",
            subscription_status: "canceled",
            stripe_subscription_id: null,
            current_period_end: null,
          }).eq("id", profile.id);

          console.log(`Subscription canceled for customer ${customerId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook handler error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
