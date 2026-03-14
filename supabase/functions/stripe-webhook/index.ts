// Supabase Edge Function: stripe-webhook
// Handles Stripe webhook events to sync subscription state to Supabase profiles.

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  // ── Verify signature ──────────────────────────────────────────────────────
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

  // ── Event handlers ────────────────────────────────────────────────────────
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId) {
          console.warn("No supabase_user_id in session metadata");
          break;
        }

        // Fetch subscription to get period end
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

        await admin.from("profiles").update({
          plan: "pro",
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: subscription.status,
          current_period_end: periodEnd,
        }).eq("id", userId);

        console.log(`User ${userId} upgraded to pro`);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const periodEnd = new Date(sub.current_period_end * 1000).toISOString();
        const plan = sub.status === "active" ? "pro" : "free";

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
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
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
