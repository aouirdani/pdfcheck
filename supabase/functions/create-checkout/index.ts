// Supabase Edge Function: create-checkout
// Creates a Stripe Checkout Session for subscription.
// Body: { priceId: string, successUrl?: string, cancelUrl?: string }

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authError } = await anonClient.auth.getUser();
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  // ── Body ──────────────────────────────────────────────────────────────────
  const { priceId, successUrl, cancelUrl } = await req.json() as {
    priceId: string;
    successUrl?: string;
    cancelUrl?: string;
  };

  if (!priceId) return json({ error: "priceId is required" }, 400);

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return json({ error: "Stripe is not configured" }, 500);

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });

  // ── Find or create Stripe customer ────────────────────────────────────────
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: profile } = await adminClient
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customerId = (profile as { stripe_customer_id?: string } | null)?.stripe_customer_id;

  const createCustomer = async () => {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    await adminClient
      .from("profiles")
      .update({ stripe_customer_id: customer.id })
      .eq("id", user.id);
    return customer.id;
  };

  if (!customerId) {
    customerId = await createCustomer();
  }

  // ── Create Checkout session ───────────────────────────────────────────────
  const origin = req.headers.get("origin") ?? "https://pdf-tool-website-review.vercel.app";

  const createSession = (cid: string) =>
    stripe.checkout.sessions.create({
      customer: cid,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl ?? `${origin}?checkout=success`,
      cancel_url: cancelUrl ?? `${origin}?checkout=cancelled`,
      metadata: { supabase_user_id: user.id },
      allow_promotion_codes: true,
    });

  try {
    const session = await createSession(customerId);
    return json({ url: session.url });
  } catch (err: unknown) {
    // Stale customer ID (e.g. live-mode ID used with test key) — recreate and retry once
    const stripeErr = err as { code?: string; statusCode?: number };
    if (stripeErr.code === "resource_missing" || stripeErr.statusCode === 404) {
      console.error("Stale Stripe customer, recreating:", customerId);
      try {
        customerId = await createCustomer();
        const session = await createSession(customerId);
        return json({ url: session.url });
      } catch (retryErr: unknown) {
        console.error("Retry failed:", retryErr);
        return json({ error: retryErr instanceof Error ? retryErr.message : String(retryErr) }, 500);
      }
    }
    console.error("Stripe checkout error:", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
